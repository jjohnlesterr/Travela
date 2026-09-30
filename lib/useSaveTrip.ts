"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTrip } from "./actions";
import type { SavedRoute } from "./route";
import { setDraft, type TripDraft } from "./tripDraft";

type Options = {
  draft: TripDraft | null;
  onSaved: (next: TripDraft) => void;
  /** Screen to come back to after login (the hook appends ?save=1 and auto-saves on return). */
  returnPath: string;
  /** Route to store with the trip (order + metrics only). */
  getRoute: () => SavedRoute | null;
};

/** Save-trip flow shared by the itinerary and route screens, including the login round-trip. */
export function useSaveTrip({ draft, onSaved, returnPath, getRoute }: Options) {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTried = useRef(false);

  const save = useCallback(async () => {
    if (!draft?.itinerary || draft.savedTripId) return;
    setSaving(true);
    setError(null);
    const res = await saveTrip({
      slug: draft.destination.slug,
      days: draft.days,
      interests: draft.interests,
      itinerary: draft.itinerary,
      route: getRoute(),
    }).catch(() => ({ ok: false as const, reason: "error" as const, message: "Saving failed. Check your connection and try again." }));
    setSaving(false);
    if (res.ok) {
      const next = { ...draft, savedTripId: res.id };
      setDraft(next);
      onSaved(next);
    } else if (res.reason === "auth") {
      router.push(`/login?next=${encodeURIComponent(`${returnPath}?save=1`)}`);
    } else {
      setError(res.message);
    }
  }, [draft, getRoute, onSaved, returnPath, router]);

  // Back from login with ?save=1 → save once, then clean the URL.
  const wantsAutoSave = params.get("save") === "1";
  const ready = Boolean(draft?.itinerary);
  useEffect(() => {
    if (!wantsAutoSave || autoSaveTried.current || !ready) return;
    autoSaveTried.current = true;
    router.replace(returnPath);
    void Promise.resolve().then(save);
  }, [wantsAutoSave, ready, returnPath, router, save]);

  return { save, saving, error, saved: Boolean(draft?.savedTripId) };
}
