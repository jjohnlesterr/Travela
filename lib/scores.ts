/** Estimated Tourism Pressure for the curated catalog: cached Apify snapshot when available, baseline otherwise. */
import { readSnapshots } from "./cache";
import { DESTINATIONS, type Destination } from "./destinations";
import { computePressure, currentMonth, SCORING_VERSION, type Pressure, type PressureSnapshot } from "./pressure";

export type CatalogScore = { score: number; source: "apify" | "baseline" };

export function catalogPressure(d: Destination, snapshot: PressureSnapshot | null, month = currentMonth()): Pressure {
  const s = snapshot?.version === SCORING_VERSION ? snapshot : null;
  return computePressure({
    density: s?.density ?? d.baseline.density,
    popularity: s?.popularity ?? d.baseline.popularity,
    nearby: s?.nearby ?? null,
    sensitivity: d.sensitivity,
    peakMonths: d.peakMonths,
    shoulderMonths: d.shoulderMonths,
    month,
  });
}

/** One Supabase query for all catalog destinations; never throws (falls back to baseline). */
export async function getCatalogScores(month = currentMonth()): Promise<Record<string, CatalogScore>> {
  const snapshots = await readSnapshots(DESTINATIONS.map((d) => d.slug));
  return Object.fromEntries(
    DESTINATIONS.map((d) => {
      const snap = snapshots.get(d.slug) ?? null;
      const usable = snap?.version === SCORING_VERSION;
      return [d.slug, { score: catalogPressure(d, snap, month).score, source: usable ? "apify" : "baseline" }];
    }),
  );
}
