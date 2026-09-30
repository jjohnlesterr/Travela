/**
 * Pre-fetch Apify place data for curated destinations into Supabase before a demo.
 *
 *   npm run warm                       # dry run: shows what is cached / stale and the estimated cost
 *   npm run warm -- --yes              # fetch every missing or stale catalog destination (sequential)
 *   npm run warm -- --yes --only=boracay,siquijor
 *
 * Fresh rows (< 7 days) are always skipped, so re-running is free.
 */
import { getAnalysis } from "../lib/analysis";
import { maxPlacesPerSearch } from "../lib/apify";
import { isFresh, readCacheRow } from "../lib/cache";
import { DESTINATIONS } from "../lib/destinations";

const USD_PER_PLACE = 0.004; // Apify free tier, Google Maps Scraper "Scraped place" event

async function main() {
  const args = process.argv.slice(2);
  const run = args.includes("--yes");
  const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  const targets = DESTINATIONS.filter((d) => !only || only.includes(d.slug));

  const todo: string[] = [];
  for (const d of targets) {
    const row = await readCacheRow(d.slug);
    const state = !row ? "missing" : isFresh(row.fetched_at) ? "fresh" : "stale";
    console.log(`${d.slug.padEnd(12)} ${state}${row ? ` (${row.place_count} places, ${row.fetched_at})` : ""}`);
    if (state !== "fresh") todo.push(d.slug);
  }

  const maxCost = todo.length * 3 * maxPlacesPerSearch() * USD_PER_PLACE;
  console.log(`\n${todo.length} to fetch, at most ~$${maxCost.toFixed(2)} of Apify credit.`);
  if (!run || !todo.length) {
    if (todo.length) console.log("Dry run. Re-run with --yes to fetch.");
    return;
  }

  for (const slug of todo) {
    const t = Date.now();
    const a = await getAnalysis(slug);
    const summary =
      a.status === "ok" ? `${a.pressure.score}/100 ${a.pressure.level} (${a.source}, ${a.placeCount} places)` : a.status;
    console.log(`${slug.padEnd(12)} → ${summary} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
