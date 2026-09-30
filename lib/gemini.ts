/**
 * Gemini itinerary generation (server only — GEMINI_API_KEY never reaches the client).
 *
 * Gemini's job is narrow: choose and order stops from a supplied place pool, write short notes,
 * a title and a few tips. Everything factual (names of mapped places, coordinates, ratings, review
 * counts, Maps links) is joined back from our own data after validation. Gemini never sees or
 * produces pressure scores.
 */
import type { Interest } from "./destinations";
import type { Itinerary, ItineraryDay, ItineraryStop, StopKind } from "./itinerary";
import { haversineKm } from "./pressure";
import type { Place } from "./places";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
/** gemini-2.5-flash is closed to new API keys; 3.5-flash is the fastest model that answers reliably today. */
const DEFAULT_MODEL = "gemini-3.5-flash";
/** Tried in order when the primary is overloaded (503), rate-limited (429) or retired (404). */
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"];
const RETRY_PAUSE_MS = 3_000;
const CALL_TIMEOUT_MS = 45_000;
const TOTAL_BUDGET_MS = 75_000;
const MAX_POOL = 40;
const MAX_STOPS_PER_DAY = 6;

export class ItineraryError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "unavailable" | "invalid",
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------------------------
// Place pool

const INTEREST_MATCH: Record<Interest, RegExp> = {
  Beaches: /beach|island|cove|sandbar|lagoon|reef|snorkel|dive|diving|bay|shore|marine/i,
  Nature: /park|falls|waterfall|mountain|hill|hiking|trail|nature|lake|cave|river|spring|garden|viewpoint|forest|terrace|volcano|lagoon|sanctuary/i,
  Food: /restaurant|caf[eé]|market|food|bistro|bakery|grill/i,
  Culture: /museum|church|historic|heritage|monument|cultural|landmark|shrine|temple|art|market|village|cathedral/i,
  Adventure: /tour|dive|diving|surf|zip|adventure|kayak|trek|climb|boat|snorkel|atv|rental|canyon/i,
};

export type PoolItem = Place & { ref: string };

/**
 * Up to 40 places: attractions ranked by interest match then review activity, plus a set of
 * well-reviewed local eateries. Lodging is left out — itineraries are about the days.
 */
export function buildPool(places: Place[], interests: Interest[]): PoolItem[] {
  const matches = (p: Place) =>
    interests.filter((i) => i !== "Food" && INTEREST_MATCH[i].test(`${p.category ?? ""} ${p.name}`)).length;
  const weight = (p: Place) => Math.log10((p.reviews ?? 0) + 1) * (p.rating ?? 3.5);

  const attractions = places
    .filter((p) => p.kind === "attraction")
    .sort((a, b) => matches(b) - matches(a) || weight(b) - weight(a))
    .slice(0, 28);
  const food = places
    .filter((p) => p.kind === "food")
    .sort((a, b) => weight(b) - weight(a))
    .slice(0, interests.includes("Food") ? 12 : 8);

  return [...attractions, ...food].slice(0, MAX_POOL).map((p, i) => ({ ...p, ref: `p${i + 1}` }));
}

// ---------------------------------------------------------------------------------------------
// Prompt + schema

const SYSTEM = `You are Travela's itinerary planner for sustainable, low-impact travel.
You plan realistic day-by-day trips using ONLY the places supplied in the PLACE POOL.

Rules:
- Pick stops from the PLACE POOL by their ref (e.g. "p7"). Never invent a hotel, restaurant, shop, tour operator or attraction name.
- If the pool runs out or has nothing suitable, add a generic activity with placeRef null and a descriptive name (e.g. "Slow morning by the shore", "Free time to explore on foot") — never a specific business name.
- 3 to 5 stops per day, times between 07:00 and 20:00 in 24-hour "HH:MM" format, in chronological order.
- Include a lunch and/or dinner stop from the pool's food places when available; prefer local eateries.
- Keep each day geographically tight: use the coordinates to group nearby places on the same day and order them to avoid back-and-forth travel. Do not repeat a place on different days.
- Match the traveler's interests, but keep variety across days.
- Notes: one short, practical sentence per stop (what to do there, a low-impact tip). Only suggest — never assert facts about a place that are not in the pool (ownership, awards, history, certifications, menu items). Do NOT state ratings, review counts, prices, opening hours, distances, travel times, crowd levels, visitor numbers or any score.
- Write everything in plain English.
- Tips: 2–3 short sustainability tips for this trip. No statistics.
- Title: short and friendly, max 8 words.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "INTEGER" },
          theme: { type: "STRING" },
          stops: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                time: { type: "STRING" },
                placeRef: { type: "STRING", nullable: true },
                name: { type: "STRING" },
                kind: { type: "STRING", enum: ["attraction", "food", "activity"] },
                note: { type: "STRING" },
              },
              required: ["time", "placeRef", "name", "kind", "note"],
            },
          },
        },
        required: ["day", "theme", "stops"],
      },
    },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["title", "days", "tips"],
};

type Input = {
  destination: { name: string; region: string | null; country: string | null };
  days: number;
  interests: Interest[];
  pool: PoolItem[];
  /** Context only — lets Gemini lean toward quieter choices. Never echoed. */
  pressureLevel: string | null;
};

function buildPrompt({ destination, days, interests, pool, pressureLevel }: Input) {
  const where = [destination.name, destination.region, destination.country].filter(Boolean).join(", ");
  const lines = pool.map(
    (p) => `${p.ref} | ${p.name} | ${p.kind} | ${p.category ?? "-"} | ${p.lat.toFixed(4)},${p.lng.toFixed(4)}`,
  );
  return [
    `Destination: ${where}`,
    `Trip length: ${days} day${days > 1 ? "s" : ""}`,
    `Interests: ${interests.join(", ")}`,
    pressureLevel === "HIGH" || pressureLevel === "MODERATE"
      ? "Context: this destination is busy. Favor quieter, walkable, locally owned options and spread activities out."
      : "Context: favor walkable, locally owned options.",
    "",
    pool.length
      ? `PLACE POOL (ref | name | kind | category | lat,lng):\n${lines.join("\n")}`
      : "PLACE POOL: (empty — no mapped places yet. Use only generic activities with placeRef null; do not name any specific business or attraction.)",
    "",
    `Return exactly ${days} day object${days > 1 ? "s" : ""}, numbered 1 to ${days}.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------
// Validation + join

type RawStop = { time?: unknown; placeRef?: unknown; name?: unknown; kind?: unknown; note?: unknown };
type RawDay = { day?: unknown; theme?: unknown; stops?: unknown };
type Raw = { title?: unknown; days?: unknown; tips?: unknown };

/** Words in non-Latin scripts occasionally leak into model output; drop them from Gemini-written text. */
const FOREIGN_WORD = /\S*[Ѐ-ӿ֐-ۿ฀-๿぀-ヿ㐀-鿿가-힯]\S*\s?/g;

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(FOREIGN_WORD, "").replace(/\s{2,}/g, " ").trim().slice(0, max) : "";

function normalizeTime(v: unknown): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(str(v, 10));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Validates Gemini's JSON and joins factual place data. Throws ItineraryError("invalid") if unusable. */
export function validateItinerary(raw: Raw, input: Input, model: string): Itinerary {
  const byRef = new Map(input.pool.map((p) => [p.ref, p]));
  const where = [input.destination.name, input.destination.region].filter(Boolean).join(", ");
  const rawDays = Array.isArray(raw.days) ? (raw.days as RawDay[]) : [];
  if (rawDays.length < input.days) throw new ItineraryError(`expected ${input.days} days, got ${rawDays.length}`, "invalid");

  const used = new Set<string>();
  const days: ItineraryDay[] = rawDays.slice(0, input.days).map((d, i) => {
    const stops: ItineraryStop[] = [];
    for (const s of (Array.isArray(d.stops) ? d.stops : []) as RawStop[]) {
      const time = normalizeTime(s.time);
      const place = typeof s.placeRef === "string" ? byRef.get(s.placeRef.trim()) : undefined;
      if (place && used.has(place.id)) continue; // no repeats across the trip
      const name = place ? place.name : str(s.name, 80);
      if (!time || !name) continue;
      if (place) used.add(place.id);
      const kind: StopKind = place ? place.kind : s.kind === "food" ? "food" : "activity";
      stops.push({
        time,
        placeId: place?.id ?? null,
        name,
        kind,
        note: str(s.note, 220),
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        category: place?.category ?? null,
        rating: place?.rating ?? null,
        reviews: place?.reviews ?? null,
        mapsUrl: place?.url ?? mapsSearchUrl(place ? `${place.name}, ${where}` : where),
      });
    }
    stops.sort((a, b) => a.time.localeCompare(b.time));
    return { day: i + 1, theme: str(d.theme, 60) || `Day ${i + 1}`, stops: stops.slice(0, MAX_STOPS_PER_DAY) };
  });

  if (days.some((d) => d.stops.length === 0)) throw new ItineraryError("a day has no valid stops", "invalid");
  const tips = (Array.isArray(raw.tips) ? raw.tips : []).map((t) => str(t, 200)).filter(Boolean).slice(0, 3);

  return {
    title: str(raw.title, 80) || `${input.days} days in ${input.destination.name}`,
    days,
    tips,
    grounded: input.pool.length > 0,
    model,
    generatedAt: new Date().toISOString(),
  };
}

/** Largest distance between two mapped stops on the same day — used for a sanity log only. */
export function daySpreadKm(day: ItineraryDay) {
  const pts = day.stops.filter((s) => s.lat !== null && s.lng !== null) as (ItineraryStop & { lat: number; lng: number })[];
  let max = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) max = Math.max(max, haversineKm(pts[i], pts[j]));
  return Math.round(max * 10) / 10;
}

// ---------------------------------------------------------------------------------------------
// API call with model fallback + one retry on invalid output

async function callModel(model: string, prompt: string, signal: AbortSignal): Promise<{ status: number; text: string }> {
  const thinking = /gemini-(3|flash-latest|pro-latest)/.test(model) ? { thinkingConfig: { thinkingLevel: "low" } } : {};
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, ...thinking },
    }),
    cache: "no-store",
    signal,
  });
  const json = await res.json().catch(() => null);
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!res.ok) console.warn(`[gemini] ${model} HTTP ${res.status}: ${String(json?.error?.message ?? "").slice(0, 160)}`);
  return { status: res.status, text };
}

export async function generateItinerary(input: Input): Promise<Itinerary> {
  if (!process.env.GEMINI_API_KEY) throw new ItineraryError("GEMINI_API_KEY is not configured", "config");

  const models = [process.env.GEMINI_MODEL || DEFAULT_MODEL, ...FALLBACK_MODELS].filter((m, i, a) => a.indexOf(m) === i);
  const prompt = buildPrompt(input);
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let invalidRetries = 1;
  let lastError: ItineraryError = new ItineraryError("no model answered", "unavailable");

  // Two passes over the model chain: Gemini "high demand" 503s are usually brief, so after every model
  // has been busy once, pause and try the chain again (all within TOTAL_BUDGET_MS).
  const attempts = models.length * 2;
  for (let i = 0; i < attempts && Date.now() < deadline - 5_000; ) {
    if (i === models.length) {
      console.warn("[gemini] every model busy — retrying the chain after a short pause");
      await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS));
    }
    const model = models[i % models.length];
    const started = Date.now();
    try {
      const { status, text } = await callModel(
        model,
        prompt,
        AbortSignal.timeout(Math.min(CALL_TIMEOUT_MS, deadline - Date.now())),
      );
      if (status !== 200) {
        // Overloaded / retired / rate-limited → try the next model.
        lastError = new ItineraryError(`${model} HTTP ${status}`, "unavailable");
        i++;
        continue;
      }
      const itinerary = validateItinerary(JSON.parse(text) as Raw, input, model);
      console.info(
        `[gemini] ${model} ok in ${Date.now() - started} ms · ${itinerary.days.length} days · spread km ${itinerary.days.map(daySpreadKm).join("/")}`,
      );
      return itinerary;
    } catch (err) {
      const e = err as Error;
      if (e.name === "TimeoutError" || e.name === "AbortError") {
        lastError = new ItineraryError(`${model} timed out`, "unavailable");
        i++;
      } else {
        lastError = err instanceof ItineraryError ? err : new ItineraryError(`${model}: ${e.message}`, "invalid");
        console.warn(`[gemini] ${lastError.message}`);
        if (invalidRetries-- <= 0) i++; // one retry on the same model, then move on
      }
    }
  }
  throw lastError;
}
