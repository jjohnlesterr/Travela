/**
 * Open-Meteo geocoding (GeoNames data, no API key) for destinations outside the curated catalog.
 * Dynamic destinations get a canonical slug `<name>-<geonamesId>` so the same place always maps to
 * the same cache row, however the user typed it.
 */
import { slugify } from "./destinations";

export type GeoPlace = {
  id: number;
  name: string;
  /** Province / state when known, else the top-level region. */
  region: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number;
  lng: number;
};

type GeoResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  country?: string;
  country_code?: string;
  population?: number;
};

const BASE = "https://geocoding-api.open-meteo.com/v1";
const TIMEOUT_MS = 6000;

function toPlace(r: GeoResult): GeoPlace {
  return {
    id: r.id,
    name: r.name,
    region: r.admin2 ?? r.admin1 ?? null,
    country: r.country ?? null,
    countryCode: r.country_code?.toUpperCase() ?? null,
    lat: r.latitude,
    lng: r.longitude,
  };
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`geocoding HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Up to `count` candidates, Philippine matches first (Travela's focus), then the rest in relevance order. */
export async function searchPlaces(query: string, count = 5): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const variants = [q, q.split(",")[0].trim()].filter((v, i, a) => v.length >= 2 && a.indexOf(v) === i);
  for (const name of variants) {
    const json = await get<{ results?: GeoResult[] }>(
      `${BASE}/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`,
    );
    const raw = json.results ?? [];
    if (raw.length) {
      const isPH = (r: GeoResult) => r.country_code?.toUpperCase() === "PH";
      // PH in relevance order first; elsewhere the best-known place (by population) first — "Bali" → Indonesia.
      const rest = raw.filter((r) => !isPH(r)).sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
      return [...raw.filter(isPH), ...rest].slice(0, count).map(toPlace);
    }
  }
  return [];
}

export async function getPlace(id: number): Promise<GeoPlace | null> {
  try {
    const r = await get<GeoResult & { error?: boolean }>(`${BASE}/get?id=${id}`);
    return r && !r.error && typeof r.latitude === "number" ? toPlace(r) : null;
  } catch (err) {
    console.warn("[geocode] get failed:", (err as Error).message);
    return null;
  }
}

export const placeSlug = (p: Pick<GeoPlace, "id" | "name">) => `${slugify(p.name) || "place"}-${p.id}`;

/** Extracts the GeoNames id from a canonical dynamic slug (`puerto-galera-1692688` → 1692688). */
export function idFromSlug(slug: string): number | null {
  const m = /-(\d{3,10})$/.exec(slug);
  return m ? Number(m[1]) : null;
}
