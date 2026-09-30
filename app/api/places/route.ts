import { searchPlaces, placeSlug } from "@/lib/geocode";

/**
 * GET /api/places?q=… → geocoded destination suggestions for the search bar.
 * Uses only the free Open-Meteo geocoder (no Apify spend). Always returns 200 with a (possibly empty) list.
 */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 3) return Response.json({ results: [] });
  try {
    const places = await searchPlaces(q, 5);
    return Response.json(
      {
        results: places.map((p) => ({
          slug: placeSlug(p),
          name: p.name,
          detail: [p.region, p.country].filter(Boolean).join(", "),
        })),
      },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return Response.json({ results: [] });
  }
}
