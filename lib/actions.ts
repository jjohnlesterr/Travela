"use server";

import { redirect } from "next/navigation";
import { getDestinationSummary } from "./analysis";
import { INTERESTS, type Interest } from "./destinations";
import { MAX_DAYS, type Itinerary } from "./itinerary";
import type { SavedRoute } from "./route";
import { createClient } from "./supabase/server";

export type SaveTripResult = { ok: true; id: string } | { ok: false; reason: "auth" | "invalid" | "error"; message: string };

const MAX_ITINERARY_BYTES = 60_000;

function validItinerary(it: unknown, days: number): it is Itinerary {
  const i = it as Itinerary;
  return (
    !!i &&
    typeof i.title === "string" &&
    Array.isArray(i.days) &&
    i.days.length === days &&
    i.days.every((d) => Array.isArray(d.stops) && d.stops.every((s) => typeof s.name === "string" && typeof s.time === "string")) &&
    Array.isArray(i.tips) &&
    JSON.stringify(i).length <= MAX_ITINERARY_BYTES
  );
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 100_000 ? v : null);

/** Keeps only the expected route fields (order ids + metrics). Coordinates are never stored. */
function cleanRoute(route: unknown, itinerary: Itinerary): SavedRoute | null {
  const r = route as SavedRoute | null;
  if (!r || !Array.isArray(r.perDay) || !r.totals) return null;
  const ids = new Set(itinerary.days.flatMap((d) => d.stops.map((s) => s.placeId)).filter(Boolean));
  const perDay = r.perDay
    .filter((d) => Number.isInteger(d.day) && Array.isArray(d.order))
    .map((d) => ({
      day: d.day,
      order: d.order.filter((id) => typeof id === "string" && ids.has(id)),
      km: num(d.km) ?? 0,
      minutes: num(d.minutes) ?? 0,
      savedKm: num(d.savedKm) ?? 0,
      co2SavedKg: num(d.co2SavedKg) ?? 0,
    }));
  const t = r.totals;
  return {
    origin: r.origin === "current-location" ? "current-location" : "first-stop",
    perDay,
    totals: { km: num(t.km) ?? 0, savedKm: num(t.savedKm) ?? 0, minutes: num(t.minutes) ?? 0, co2SavedKg: num(t.co2SavedKg) ?? 0 },
  };
}

/**
 * Saves the current trip for the signed-in user. The user id comes from the session (RLS enforces it too),
 * and the pressure score is looked up server-side rather than trusted from the client.
 */
export async function saveTrip(input: {
  slug: string;
  days: number;
  interests: string[];
  itinerary: unknown;
  route?: unknown;
}): Promise<SaveTripResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, reason: "auth", message: "Please sign in to save your trip." };

  const days = Number(input.days);
  const interests = (Array.isArray(input.interests) ? input.interests : []).filter((i): i is Interest =>
    INTERESTS.includes(i as Interest),
  );
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS || !validItinerary(input.itinerary, days)) {
    return { ok: false, reason: "invalid", message: "This trip couldn't be saved. Try generating it again." };
  }

  const destination = await getDestinationSummary(String(input.slug ?? ""));
  if (!destination) return { ok: false, reason: "invalid", message: "We couldn't find this destination." };

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      destination_slug: destination.slug,
      destination_name: destination.name,
      days,
      interests,
      pressure_score: destination.pressure?.score ?? null,
      pressure_level: destination.pressure?.level ?? null,
      itinerary: input.itinerary,
      route: cleanRoute(input.route, input.itinerary),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.warn("[trips] save failed:", error?.message);
    return { ok: false, reason: "error", message: "Saving failed. Please try again." };
  }
  return { ok: true, id: data.id as string };
}

/** Deletes one of the signed-in user's trips (RLS guarantees ownership), then returns to the list. */
export async function deleteTrip(id: string): Promise<{ ok: false; message: string } | never> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trips").delete().eq("id", String(id)).select("id");
  if (error || !data?.length) return { ok: false, message: "This trip couldn't be deleted. Please try again." };
  redirect("/trips");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
