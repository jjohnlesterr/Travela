/** Itinerary types shared by the Gemini route (server) and the itinerary screen (client). */
import type { PressureLevel } from "./destinations";
import type { TripInterest } from "./interests";

export type StopKind = "lodging" | "attraction" | "food" | "activity";

export type ItineraryStop = {
  time: string;
  /** Apify place id when the stop was picked from the mapped place pool, else null (generic activity). */
  placeId: string | null;
  name: string;
  kind: StopKind;
  note: string;
  // Factual fields below come only from our place data — never from Gemini.
  lat: number | null;
  lng: number | null;
  category: string | null;
  rating: number | null;
  reviews: number | null;
  mapsUrl: string;
};

export type ItineraryDay = { day: number; theme: string; stops: ItineraryStop[] };

export type Itinerary = {
  title: string;
  days: ItineraryDay[];
  tips: string[];
  /** True when stops were chosen from mapped Google Maps places (vs. a general plan). */
  grounded: boolean;
  model: string;
  generatedAt: string;
};

export type TripDestination = {
  slug: string;
  name: string;
  region: string | null;
  score: number | null;
  level: PressureLevel | null;
};

/** Quick presets on the plan form; any whole number from MIN_DAYS to MAX_DAYS is allowed via "Custom". */
export const DAY_OPTIONS = [1, 3, 5, 7] as const;
export const MIN_DAYS = 1;
export const MAX_DAYS = 14;

export function isValidDays(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= MIN_DAYS && n <= MAX_DAYS;
}

export type ItineraryRequest = { slug: string; days: number; interests: TripInterest[] };
