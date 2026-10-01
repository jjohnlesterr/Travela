/**
 * Destination Analysis orchestrator (server only).
 *
 *   resolve destination (catalog | GeoNames id | free text → canonical redirect)
 *   → places: fresh Supabase cache → Apify (deduped, daily-capped) → stale cache → baseline (catalog only)
 *   → deterministic Estimated Tourism Pressure → greener alternative
 *   → weather in parallel (optional, display only)
 */
import { apifyToken, fetchPlaces } from "./apify";
import { pickAlternative, SHOW_ALTERNATIVE_AT, type Alternative } from "./alternatives";
import { isFresh, readCacheRow, writeCacheRow, apifyRunsLast24h, type CacheRow } from "./cache";
import { DESTINATIONS, getDestination, pressureLevel, type Destination, type Interest } from "./destinations";
import { getPlace, idFromSlug, placeSlug, searchPlaces, type GeoPlace } from "./geocode";
import { deriveInterests, type TripInterest } from "./interests";
import { interestsFromPlaces, type Place } from "./places";
import {
  computePressure,
  currentMonth,
  DEFAULT_SENSITIVITY,
  defaultSeasons,
  haversineKm,
  SCORING_VERSION,
  snapshotFromPlaces,
  type Pressure,
  type PressureSnapshot,
} from "./pressure";
import { catalogPressure, getCatalogScores } from "./scores";
import { getWeather, type Weather } from "./weather";

/** Fewer mapped places than this is not enough signal to score a place outside the catalog. */
const MIN_PLACES = 5;
/** A searched place this close to a curated destination is treated as that destination. */
const SNAP_TO_CATALOG_KM = 5;
const FAILURE_COOLDOWN_MS = 10 * 60 * 1000;

export type DestinationInfo = {
  slug: string;
  name: string;
  region: string | null;
  countryCode: string | null;
  lat: number;
  lng: number;
  catalog: Destination | null;
};

/** Where the numbers came from — shown to the user in plain language. */
export type DataSource = "live" | "cache" | "stale-cache" | "baseline";

export type Analysis = {
  status: "ok";
  destination: DestinationInfo;
  interests: Interest[];
  pressure: Pressure;
  source: DataSource;
  fetchedAt: string | null;
  placeCount: number;
  /** Present when score ≥ SHOW_ALTERNATIVE_AT and a similar calmer destination exists. */
  alternative: Alternative | null;
  showAlternative: boolean;
  weather: Weather | null;
  /** Mapped places behind the score (server-side only; feeds the itinerary place pool). */
  places: Place[];
};

export type AnalysisResult =
  | Analysis
  | { status: "redirect"; slug: string }
  | { status: "not-found"; query: string; lookupFailed: boolean }
  | {
      status: "no-data";
      destination: DestinationInfo;
      weather: Weather | null;
      /** "few-places": we looked and found little tourism activity. "unavailable": we couldn't look right now. */
      reason: "few-places" | "unavailable";
    };

// ---------------------------------------------------------------------------------------------
// Destination resolution

const fromCatalog = (d: Destination): DestinationInfo => ({
  slug: d.slug,
  name: d.name,
  region: d.region,
  countryCode: "PH",
  lat: d.lat,
  lng: d.lng,
  catalog: d,
});

const fromGeo = (g: GeoPlace): DestinationInfo => ({
  slug: placeSlug(g),
  name: g.name,
  region: g.region,
  countryCode: g.countryCode,
  lat: g.lat,
  lng: g.lng,
  catalog: null,
});

function nearbyCatalog(p: { lat: number; lng: number }) {
  return DESTINATIONS.find((d) => haversineKm(d, p) <= SNAP_TO_CATALOG_KM) ?? null;
}

type Resolved = { kind: "ok"; info: DestinationInfo; row: CacheRow | null } | { kind: "redirect"; slug: string } | { kind: "not-found" };

async function resolve(slug: string): Promise<Resolved> {
  const catalog = getDestination(slug);
  if (catalog) return { kind: "ok", info: fromCatalog(catalog), row: await readCacheRow(slug) };

  const id = idFromSlug(slug);
  if (id !== null) {
    // Canonical dynamic slug. The cache row already knows name + coordinates, so no geocoding needed.
    const row = await readCacheRow(slug);
    if (row) {
      return {
        kind: "ok",
        row,
        info: { slug, name: row.name, region: row.region, countryCode: row.country_code, lat: row.lat, lng: row.lng, catalog: null },
      };
    }
    const geo = await getPlace(id);
    if (!geo) return { kind: "not-found" };
    const snap = nearbyCatalog(geo);
    if (snap) return { kind: "redirect", slug: snap.slug };
    const info = fromGeo(geo);
    return info.slug === slug ? { kind: "ok", info, row: null } : { kind: "redirect", slug: info.slug };
  }

  // Free text typed into the URL or submitted without picking a suggestion.
  const query = decodeURIComponent(slug).replace(/[-_+]+/g, " ");
  const byName = DESTINATIONS.find((d) => d.name.toLowerCase() === query.toLowerCase().trim());
  if (byName) return { kind: "redirect", slug: byName.slug };
  const [geo] = await searchPlaces(query, 1);
  if (!geo) return { kind: "not-found" };
  return { kind: "redirect", slug: nearbyCatalog(geo)?.slug ?? placeSlug(geo) };
}

// ---------------------------------------------------------------------------------------------
// Places data: cache → Apify → stale cache

const inFlight = new Map<string, Promise<Place[]>>();
const recentFailures = new Map<string, number>();

function dailyLimit() {
  const n = Number(process.env.APIFY_DAILY_RUN_LIMIT);
  return Number.isFinite(n) && n >= 0 ? n : 15;
}

function locationQuery(info: DestinationInfo) {
  const country = info.countryCode === "PH" || info.catalog ? "Philippines" : (info.countryCode ?? "");
  return [info.name, info.region, country].filter(Boolean).join(", ");
}

async function refreshFromApify(info: DestinationInfo): Promise<CacheRow | null> {
  if (!apifyToken()) return null;
  const failedAt = recentFailures.get(info.slug);
  if (failedAt && Date.now() - failedAt < FAILURE_COOLDOWN_MS) return null;

  let pending = inFlight.get(info.slug);
  if (!pending) {
    if ((await apifyRunsLast24h()) >= dailyLimit()) {
      console.warn(`[analysis] Apify daily limit (${dailyLimit()}) reached — skipping live fetch for ${info.slug}`);
      return null;
    }
    console.info(`[analysis] cache miss → Apify for ${info.slug}`);
    pending = fetchPlaces(locationQuery(info)).finally(() => inFlight.delete(info.slug));
    inFlight.set(info.slug, pending);
  }

  try {
    const places = await pending;
    const row: CacheRow = {
      slug: info.slug,
      name: info.name,
      region: info.region,
      country_code: info.countryCode,
      lat: info.lat,
      lng: info.lng,
      places,
      place_count: places.length,
      pressure: snapshotFromPlaces(places, info),
      source: "apify",
      fetched_at: new Date().toISOString(),
    };
    await writeCacheRow(row);
    return row;
  } catch (err) {
    recentFailures.set(info.slug, Date.now());
    console.warn(`[analysis] Apify failed for ${info.slug}:`, (err as Error).message);
    return null;
  }
}

async function loadPlaces(info: DestinationInfo, cached: CacheRow | null) {
  if (cached && isFresh(cached.fetched_at)) {
    console.info(`[analysis] cache hit for ${info.slug}`);
    return { row: cached, source: "cache" as const };
  }
  const live = await refreshFromApify(info);
  if (live) return { row: live, source: "live" as const };
  if (cached) return { row: cached, source: "stale-cache" as const };
  return null;
}

function snapshotOf(row: CacheRow): PressureSnapshot {
  return row.pressure?.version === SCORING_VERSION ? row.pressure : snapshotFromPlaces(row.places, row);
}

// ---------------------------------------------------------------------------------------------

export async function getAnalysis(slug: string): Promise<AnalysisResult> {
  const query = decodeURIComponent(slug).replace(/-\d+$/, "").replace(/[-_+]+/g, " ");
  let resolved: Resolved;
  try {
    resolved = await resolve(slug);
  } catch (err) {
    console.warn("[analysis] could not resolve destination:", (err as Error).message);
    return { status: "not-found", query, lookupFailed: true };
  }
  if (resolved.kind === "redirect") return { status: "redirect", slug: resolved.slug };
  if (resolved.kind === "not-found") return { status: "not-found", query, lookupFailed: false };

  const { info, row: cached } = resolved;
  const month = currentMonth();
  const [placesResult, weatherResult] = await Promise.allSettled([
    loadPlaces(info, cached),
    getWeather(info.lat, info.lng),
  ]);
  const data = placesResult.status === "fulfilled" ? placesResult.value : null;
  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;

  const enough = data && data.row.places.length >= MIN_PLACES;
  let pressure: Pressure;
  let source: DataSource;
  let interests: Interest[];

  if (info.catalog) {
    const d = info.catalog;
    pressure = catalogPressure(d, enough ? snapshotOf(data.row) : null, month);
    source = enough ? data.source : "baseline";
    interests = d.interests;
  } else if (enough) {
    const snap = snapshotOf(data.row);
    const seasons = defaultSeasons(info.countryCode, info.lat);
    pressure = computePressure({ ...snap, sensitivity: DEFAULT_SENSITIVITY, ...seasons, month });
    source = data.source;
    interests = interestsFromPlaces(data.row.places);
  } else {
    return { status: "no-data", destination: info, weather, reason: data ? "few-places" : "unavailable" };
  }

  const showAlternative = pressure.score >= SHOW_ALTERNATIVE_AT;
  let alternative: Alternative | null = null;
  if (showAlternative && info.countryCode === "PH") {
    const scores = await getCatalogScores(month);
    alternative = pickAlternative(
      { slug: info.slug, score: pressure.score, interests },
      DESTINATIONS.map((d) => ({ destination: d, score: scores[d.slug].score })),
    );
  }

  return {
    status: "ok",
    destination: info,
    interests,
    pressure,
    source,
    fetchedAt: enough ? data.row.fetched_at : null,
    placeCount: enough ? data.row.places.length : 0,
    alternative,
    showAlternative,
    weather,
    places: enough ? data.row.places : [],
  };
}

// ---------------------------------------------------------------------------------------------
// Cheap summary for the planning screens: never calls Apify.

export type DestinationSummary = {
  slug: string;
  name: string;
  region: string | null;
  countryCode: string | null;
  image: string | null;
  interests: Interest[];
  pressure: Pick<Pressure, "score" | "level"> | null;
};

export async function getDestinationSummary(slug: string): Promise<DestinationSummary | null> {
  const catalog = getDestination(slug);
  if (catalog) {
    const scores = await getCatalogScores();
    const score = scores[slug].score;
    return {
      slug,
      name: catalog.name,
      region: catalog.region,
      countryCode: "PH",
      image: catalog.image,
      interests: catalog.interests,
      pressure: { score, level: pressureLevel(score) },
    };
  }
  const id = idFromSlug(slug);
  if (id === null) return null;
  const row = await readCacheRow(slug);
  if (row) {
    const enough = row.places.length >= MIN_PLACES;
    const p = enough
      ? computePressure({
          ...snapshotOf(row),
          sensitivity: DEFAULT_SENSITIVITY,
          ...defaultSeasons(row.country_code, row.lat),
          month: currentMonth(),
        })
      : null;
    return {
      slug,
      name: row.name,
      region: row.region,
      countryCode: row.country_code,
      image: null,
      interests: enough ? interestsFromPlaces(row.places) : [],
      pressure: p ? { score: p.score, level: p.level } : null,
    };
  }
  const geo = await getPlace(id);
  if (!geo) return null;
  return { slug, name: geo.name, region: geo.region, countryCode: geo.countryCode, image: null, interests: [], pressure: null };
}

/**
 * Trip interests offered on the plan form, derived from the destination's cached places
 * (plus curated catalog interests). Cache-only: never calls Apify. Falls back to universal interests.
 */
export async function getTripInterests(slug: string): Promise<TripInterest[]> {
  const row = await readCacheRow(slug).catch(() => null);
  return deriveInterests(row?.places ?? [], getDestination(slug)?.interests ?? []);
}
