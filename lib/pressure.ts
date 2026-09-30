/**
 * Estimated Tourism Pressure — deterministic, pure scoring (docs/PLAN.md §9).
 * No network, no AI. Same inputs always give the same score.
 *
 *   score = round(0.40·Density + 0.30·Popularity + 0.20·Seasonality + 0.10·Environment)
 *   level = 0–39 LOW · 40–69 MODERATE · 70–100 HIGH
 */
import { pressureLevel, type PressureLevel } from "./destinations";
import type { Place } from "./places";

export const WEIGHTS = { density: 0.4, popularity: 0.3, seasonality: 0.2, environment: 0.1 } as const;

/** Places within this radius of the destination center count toward Density. */
export const DENSITY_RADIUS_KM = 3;
/** Place count that maps to a full density signal (≈ what one Apify run can return). */
export const DENSITY_FULL_COUNT = 36;
/** Popularity maps log10(total reviews of the top 20 places) onto 0..100: ~316 reviews → 0, ~31.6k → 100.
 *  Tuned on live Apify data (Boracay top-20 ≈ 21k reviews, Siquijor ≈ 3.6k). */
export const POPULARITY_LOG_RANGE = [2.5, 4.5] as const;

export const SEASON_SCORE = { peak: 90, shoulder: 55, off: 25 } as const;

export type Factors = { density: number; popularity: number; seasonality: number; environment: number };
export type Season = keyof typeof SEASON_SCORE;

export type Pressure = {
  score: number;
  level: PressureLevel;
  factors: Factors;
  reasons: string[];
  /** Month (1–12) the seasonality factor was computed for. */
  month: number;
  season: Season;
};

/** Bump when the Density/Popularity formulas change so cached snapshots are recomputed from places. */
export const SCORING_VERSION = 1;

/** The part of a pressure result that depends on scraped data and is safe to cache. */
export type PressureSnapshot = { version: number; density: number; popularity: number; nearby: number; computedAt: string };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const monthName = (m: number) => MONTHS[(m - 1 + 12) % 12];

export function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Tourism Density: how many hotels, attractions and eateries cluster near the center, weighted a little toward lodging. */
export function densityFactor(places: Place[], center: { lat: number; lng: number }) {
  const near = places.filter((p) => haversineKm(p, center) <= DENSITY_RADIUS_KM);
  const lodgingShare = near.filter((p) => p.kind === "lodging").length / Math.max(1, near.length);
  const density = clamp((near.length / DENSITY_FULL_COUNT) * 100) * 0.8 + lodgingShare * 100 * 0.2;
  return { density: Math.round(clamp(density)), nearby: near.length };
}

/** Popularity: review activity of the 20 most-reviewed places, on a log scale. */
export function popularityFactor(places: Place[]) {
  const total = [...places]
    .map((p) => p.reviews ?? 0)
    .sort((a, b) => b - a)
    .slice(0, 20)
    .reduce((sum, n) => sum + n, 0);
  const [lo, hi] = POPULARITY_LOG_RANGE;
  return Math.round(clamp(((Math.log10(Math.max(total, 1)) - lo) / (hi - lo)) * 100));
}

export function seasonOf(month: number, peakMonths: number[], shoulderMonths: number[]): Season {
  if (peakMonths.includes(month)) return "peak";
  if (shoulderMonths.includes(month)) return "shoulder";
  return "off";
}

/** Snapshot of the data-driven factors from a set of scraped places. */
export function snapshotFromPlaces(places: Place[], center: { lat: number; lng: number }): PressureSnapshot {
  const { density, nearby } = densityFactor(places, center);
  return {
    version: SCORING_VERSION,
    density,
    popularity: popularityFactor(places),
    nearby,
    computedAt: new Date().toISOString(),
  };
}

type ComputeInput = {
  density: number;
  popularity: number;
  /** Places found within DENSITY_RADIUS_KM (null when using baseline data). */
  nearby: number | null;
  sensitivity: number;
  peakMonths: number[];
  shoulderMonths: number[];
  month: number;
};

export function computePressure(input: ComputeInput): Pressure {
  const season = seasonOf(input.month, input.peakMonths, input.shoulderMonths);
  const factors: Factors = {
    density: Math.round(clamp(input.density)),
    popularity: Math.round(clamp(input.popularity)),
    seasonality: SEASON_SCORE[season],
    environment: Math.round(clamp(input.sensitivity)),
  };
  const score = Math.round(
    WEIGHTS.density * factors.density +
      WEIGHTS.popularity * factors.popularity +
      WEIGHTS.seasonality * factors.seasonality +
      WEIGHTS.environment * factors.environment,
  );
  return {
    score,
    level: pressureLevel(score),
    factors,
    reasons: buildReasons(factors, season, input.month, input.nearby),
    month: input.month,
    season,
  };
}

/**
 * Plain-language, templated reasons — strongest signals first, max 4.
 * Never mentions visitor counts: these describe tourism activity signals only.
 */
export function buildReasons(f: Factors, season: Season, month: number, nearby: number | null): string[] {
  const out: { text: string; weight: number }[] = [];
  const push = (text: string, strength: number, weight: number) => out.push({ text, weight: strength * weight });

  if (f.density >= 60)
    push("High concentration of hotels, resorts and attractions near the center", f.density, WEIGHTS.density);
  else if (f.density <= 30)
    push("Tourism businesses are spread out rather than concentrated", 100 - f.density, WEIGHTS.density);
  else push("A moderate cluster of tourism businesses around the center", 50, WEIGHTS.density);

  if (nearby !== null && nearby > 0)
    push(`${nearby} hotels, attractions and eateries mapped within ${DENSITY_RADIUS_KM} km of the center`, f.density, 0.15);

  if (f.popularity >= 60)
    push("Very high review activity — a sign of heavy visitor interest", f.popularity, WEIGHTS.popularity);
  else if (f.popularity <= 30) push("Lower review activity than major hotspots", 100 - f.popularity, WEIGHTS.popularity);
  else push("Steady review activity from past visitors", 50, WEIGHTS.popularity);

  const m = monthName(month);
  if (season === "peak") push(`${m} falls in the peak travel season`, 90, WEIGHTS.seasonality);
  else if (season === "shoulder") push(`${m} is a shoulder month — busier than off-peak`, 55, WEIGHTS.seasonality);
  else push(`${m} is typically off-peak`, 75, WEIGHTS.seasonality);

  if (f.environment >= 70)
    push("Sensitive environment (e.g. small island, reefs) that feels visitor pressure sooner", f.environment, WEIGHTS.environment);

  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((r) => r.text);
}

/** Philippine default seasons for places outside the curated catalog. */
export const PH_SEASON = { peakMonths: [12, 1, 2, 3, 4, 5], shoulderMonths: [6, 11] };

/** Rough hemisphere-based seasons for non-PH destinations (summer holidays = peak). */
export function defaultSeasons(countryCode: string | null, lat: number) {
  if (!countryCode || countryCode === "PH") return PH_SEASON;
  return lat >= 0
    ? { peakMonths: [6, 7, 8], shoulderMonths: [4, 5, 9, 10, 12] }
    : { peakMonths: [12, 1, 2], shoulderMonths: [3, 4, 10, 11] };
}

export const DEFAULT_SENSITIVITY = 50;

/** Current month (1–12) in Philippine time — where the users and destinations are. */
export function currentMonth(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "Asia/Manila" }).format(now));
}
