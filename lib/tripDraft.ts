/**
 * The in-progress trip, kept in sessionStorage so preferences and the generated itinerary survive
 * refreshes, Gemini failures and the login round-trip. Client-only.
 */
import type { TripInterest } from "./interests";
import type { Itinerary, TripDestination } from "./itinerary";

export type TripDraft = {
  destination: TripDestination;
  days: number;
  interests: TripInterest[];
  itinerary: Itinerary | null;
  /** Set once saved, so the same draft is never inserted twice. */
  savedTripId: string | null;
};

const KEY = "travela:trip-draft";

export function getDraft(): TripDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TripDraft) : null;
  } catch {
    return null;
  }
}

export function setDraft(draft: TripDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* storage full or blocked — the in-memory state still works for this visit */
  }
}

export function updateDraft(patch: Partial<TripDraft>) {
  const current = getDraft();
  if (current) setDraft({ ...current, ...patch });
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
