/**
 * Supabase-backed destination cache (table `destination_cache`).
 * Reads: publishable key (RLS allows select). Writes: SUPABASE_SECRET_KEY, server only.
 * Every call is failure-tolerant: a broken cache degrades to a cache miss, never an error page.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Place } from "./places";
import type { PressureSnapshot } from "./pressure";

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CacheRow = {
  slug: string;
  name: string;
  region: string | null;
  country_code: string | null;
  lat: number;
  lng: number;
  places: Place[];
  place_count: number;
  pressure: PressureSnapshot | null;
  source: "apify";
  fetched_at: string;
};

let reader: SupabaseClient | null | undefined;
let writer: SupabaseClient | null | undefined;
let warnedNoWriter = false;

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

function readClient() {
  if (reader === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    reader = url && key ? createClient(url, key, opts) : null;
  }
  return reader;
}

function writeClient() {
  if (writer === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    writer = url && key ? createClient(url, key, opts) : null;
  }
  return writer;
}

export const isFresh = (fetchedAt: string, now = Date.now()) => now - Date.parse(fetchedAt) < CACHE_TTL_MS;

/** Process-local copy so repeat visits stay cheap even when Supabase writes are unavailable. */
const memory = new Map<string, CacheRow>();

export async function readCacheRow(slug: string): Promise<CacheRow | null> {
  const mem = memory.get(slug) ?? null;
  const db = readClient();
  if (!db) return mem;
  try {
    const { data, error } = await db.from("destination_cache").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    const row = (data as CacheRow | null) ?? null;
    // Prefer whichever copy is newer (memory wins if a DB write failed).
    if (mem && (!row || Date.parse(mem.fetched_at) > Date.parse(row.fetched_at))) return mem;
    return row;
  } catch (err) {
    console.warn("[cache] read failed:", (err as Error).message);
    return mem;
  }
}

/** Pressure snapshots for many slugs in one query (Home / Explore badges, alternatives). */
export async function readSnapshots(slugs: string[]): Promise<Map<string, CacheRow["pressure"]>> {
  const out = new Map<string, CacheRow["pressure"]>();
  for (const [slug, row] of memory) if (slugs.includes(slug)) out.set(slug, row.pressure);
  const db = readClient();
  if (!db) return out;
  try {
    const { data, error } = await db.from("destination_cache").select("slug, pressure").in("slug", slugs);
    if (error) throw error;
    for (const r of (data ?? []) as Pick<CacheRow, "slug" | "pressure">[]) if (!out.has(r.slug)) out.set(r.slug, r.pressure);
  } catch (err) {
    console.warn("[cache] snapshot read failed:", (err as Error).message);
  }
  return out;
}

export async function writeCacheRow(row: CacheRow): Promise<void> {
  memory.set(row.slug, row);
  const db = writeClient();
  if (!db) {
    if (!warnedNoWriter) console.warn("[cache] SUPABASE_SECRET_KEY not set — caching in memory only");
    warnedNoWriter = true;
    return;
  }
  try {
    const { error } = await db.from("destination_cache").upsert(row, { onConflict: "slug" });
    if (error) throw error;
  } catch (err) {
    console.warn("[cache] write failed:", (err as Error).message);
  }
}

/** Apify runs recorded in the last 24 h (DB rows refreshed + in-memory-only rows). Used for the daily spend cap. */
export async function apifyRunsLast24h(): Promise<number> {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const memCount = [...memory.values()].filter((r) => Date.parse(r.fetched_at) > since).length;
  const db = readClient();
  if (!db) return memCount;
  try {
    const { count, error } = await db
      .from("destination_cache")
      .select("slug", { count: "exact", head: true })
      .gt("fetched_at", new Date(since).toISOString());
    if (error) throw error;
    return Math.max(count ?? 0, memCount);
  } catch {
    return memCount;
  }
}
