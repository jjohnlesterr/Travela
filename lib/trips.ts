/** Saved-trip reads for Server Components. RLS limits every query to the signed-in user's rows. */
import type { PressureLevel } from "./destinations";
import type { Itinerary } from "./itinerary";
import type { SavedRoute } from "./route";
import { createClient } from "./supabase/server";

export type TripSummary = {
  id: string;
  destination_slug: string;
  destination_name: string;
  days: number;
  interests: string[];
  pressure_score: number | null;
  pressure_level: PressureLevel | null;
  created_at: string;
  title: string | null;
};

export type Trip = Omit<TripSummary, "title"> & { itinerary: Itinerary; route: SavedRoute | null };

export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return { supabase, userId: typeof claims?.sub === "string" ? claims.sub : null, claims };
}

/** null = not signed in. Throws only on a database error (caught by the route's error boundary). */
export async function listTrips(): Promise<TripSummary[] | null> {
  const { supabase, userId } = await getSessionUser();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("trips")
    .select("id, destination_slug, destination_name, days, interests, pressure_score, pressure_level, created_at, title:itinerary->>title")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`trips list failed: ${error.message}`);
  return (data ?? []) as TripSummary[];
}

/** null = not signed in; "missing" = no such trip for this user (RLS hides other users' trips). */
export async function getTrip(id: string): Promise<Trip | "missing" | null> {
  const { supabase, userId } = await getSessionUser();
  if (!userId) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return "missing";
  const { data, error } = await supabase
    .from("trips")
    .select("id, destination_slug, destination_name, days, interests, pressure_score, pressure_level, created_at, itinerary, route")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`trip read failed: ${error.message}`);
  return (data as Trip | null) ?? "missing";
}

export async function countTrips(): Promise<number | null> {
  const { supabase, userId } = await getSessionUser();
  if (!userId) return null;
  const { count } = await supabase.from("trips").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(
    new Date(iso),
  );
}
