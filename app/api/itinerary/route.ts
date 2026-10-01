import { getAnalysis } from "@/lib/analysis";
import { buildPool, generateItinerary, ItineraryError } from "@/lib/gemini";
import { isTripInterest } from "@/lib/interests";
import { isValidDays } from "@/lib/itinerary";
import { createClient } from "@/lib/supabase/server";

// Gemini + (rarely) a first-time Apify fetch can take a while.
export const maxDuration = 120;

/** Simple per-IP limiter to protect the free-tier Gemini quota. Process-local; good enough for a demo. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  hits.set(ip, [...recent, now]);
  return false;
}

const fail = (status: number, error: string) => Response.json({ error }, { status });

/**
 * POST /api/itinerary  { slug, days, interests }
 * The server loads the destination's place pool itself; the client never sends place data.
 */
export async function POST(request: Request) {
  // The app is sign-in only; API routes are outside proxy.ts, so check the session here.
  const { data: auth } = await (await createClient()).auth.getClaims();
  if (!auth?.claims?.sub) return fail(401, "Please sign in to plan a trip.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return fail(429, "You've generated a lot of trips just now. Please wait a few minutes and try again.");

  const body = (await request.json().catch(() => null)) as { slug?: unknown; days?: unknown; interests?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug.trim().slice(0, 120) : "";
  const days = Number(body?.days);
  const interests = Array.isArray(body?.interests) ? [...new Set(body.interests.filter(isTripInterest))] : [];
  if (!slug || !isValidDays(days) || interests.length === 0) {
    return fail(400, "Please choose a destination, trip length and at least one interest.");
  }

  let analysis = await getAnalysis(slug);
  if (analysis.status === "redirect") analysis = await getAnalysis(analysis.slug);
  if (analysis.status === "not-found" || analysis.status === "redirect") {
    return fail(404, "We couldn't find that destination. Please pick it again.");
  }

  const d = analysis.destination;
  const places = analysis.status === "ok" ? analysis.places : [];
  const pool = buildPool(places, interests);

  try {
    const itinerary = await generateItinerary({
      destination: { name: d.name, region: d.region, country: d.catalog || d.countryCode === "PH" ? "Philippines" : d.countryCode },
      days,
      interests,
      pool,
      pressureLevel: analysis.status === "ok" ? analysis.pressure.level : null,
    });
    return Response.json({ itinerary }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const e = err instanceof ItineraryError ? err : new ItineraryError(String(err), "invalid");
    console.warn(`[itinerary] ${slug} failed (${e.kind}): ${e.message}`);
    return fail(
      e.kind === "config" ? 503 : 502,
      e.kind === "unavailable"
        ? "Our trip planner is very busy right now. Please try again in a moment."
        : "We couldn't put your itinerary together this time. Please try again.",
    );
  }
}
