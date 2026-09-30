/**
 * Server-only Apify client for the Google Maps Scraper (compass/crawler-google-places).
 * The token never leaves the server: it is read from process.env and sent as a Bearer header.
 *
 * Cost control (free tier, pay-per-place): 3 searches × APIFY_MAX_PLACES_PER_SEARCH places,
 * no detail pages / reviews / images / contacts, and no Apify-side filters (each filter is billed
 * per place — closed places are dropped here instead).
 */
import { placeKind, type Place } from "./places";

const ACTOR = "compass~crawler-google-places";
const SEARCHES = ["hotels", "tourist attractions", "restaurants"];
const RUN_TIMEOUT_S = 90;

export function apifyToken() {
  return process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || "";
}

export function maxPlacesPerSearch() {
  const n = Number(process.env.APIFY_MAX_PLACES_PER_SEARCH);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30) : 12;
}

/** Raw dataset item — only the fields we read (per the actor's output schema). */
type RawPlace = {
  placeId?: string;
  title?: string;
  categoryName?: string | null;
  totalScore?: number | null;
  reviewsCount?: number | null;
  location?: { lat?: number; lng?: number } | null;
  address?: string | null;
  url?: string | null;
  searchString?: string | null;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
};

export function trimPlaces(items: RawPlace[]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const it of items) {
    const lat = it.location?.lat;
    const lng = it.location?.lng;
    if (!it.placeId || !it.title || typeof lat !== "number" || typeof lng !== "number") continue;
    if (it.permanentlyClosed || it.temporarilyClosed || seen.has(it.placeId)) continue;
    seen.add(it.placeId);
    out.push({
      id: it.placeId,
      name: it.title,
      category: it.categoryName ?? null,
      kind: placeKind(it.categoryName ?? null, it.searchString ?? null),
      rating: typeof it.totalScore === "number" ? it.totalScore : null,
      reviews: typeof it.reviewsCount === "number" ? it.reviewsCount : null,
      lat,
      lng,
      address: it.address ?? null,
      url: it.url ?? null,
    });
  }
  return out;
}

/** Runs the actor synchronously and returns trimmed places. Throws on missing token, HTTP error or timeout. */
export async function fetchPlaces(locationQuery: string): Promise<Place[]> {
  const token = apifyToken();
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), (RUN_TIMEOUT_S + 10) * 1000);
  const started = Date.now();
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=${RUN_TIMEOUT_S}&clean=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          searchStringsArray: SEARCHES,
          locationQuery,
          maxCrawledPlacesPerSearch: maxPlacesPerSearch(),
          language: "en",
          scrapePlaceDetailPage: false,
          scrapeContacts: false,
          scrapeReviewsPersonalData: false,
          maxReviews: 0,
          maxImages: 0,
          maxQuestions: 0,
        }),
        cache: "no-store",
        signal: controller.signal,
      },
    );
    if (!res.ok) throw new Error(`Apify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const items = (await res.json()) as RawPlace[];
    const places = trimPlaces(Array.isArray(items) ? items : []);
    console.info(`[apify] "${locationQuery}" → ${items.length} items, ${places.length} kept in ${Date.now() - started} ms`);
    return places;
  } finally {
    clearTimeout(timer);
  }
}
