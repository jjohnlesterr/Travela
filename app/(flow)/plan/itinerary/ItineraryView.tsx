"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Bookmark, BookmarkCheck, CalendarDays, Info, Leaf, Loader2, RefreshCw, SlidersHorizontal, Sparkles } from "lucide-react";
import ItineraryTimeline from "@/components/ItineraryTimeline";
import PressureBadge from "@/components/PressureBadge";
import { saveTrip } from "@/lib/actions";
import type { Itinerary } from "@/lib/itinerary";
import { getDraft, setDraft, type TripDraft } from "@/lib/tripDraft";

const LOADING_COPY = [
  "Finding local spots…",
  "Grouping nearby places by day…",
  "Picking places to eat…",
  "Adding low-impact travel tips…",
];

/** One request per draft at a time (guards React Strict Mode's double effect and double taps). */
let inFlight: { key: string; promise: Promise<Itinerary> } | null = null;

async function requestItinerary(draft: TripDraft): Promise<Itinerary> {
  const key = JSON.stringify([draft.destination.slug, draft.days, draft.interests]);
  if (inFlight?.key === key) return inFlight.promise;
  const promise = (async () => {
    const res = await fetch("/api/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: draft.destination.slug, days: draft.days, interests: draft.interests }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.itinerary) throw new Error(json.error ?? "We couldn't put your itinerary together. Please try again.");
    return json.itinerary as Itinerary;
  })();
  inFlight = { key, promise };
  promise.finally(() => {
    if (inFlight?.promise === promise) inFlight = null;
  });
  return promise;
}

const noopSubscribe = () => () => {};

/** The draft lives in sessionStorage, so this view renders after hydration. */
export default function ItineraryView() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated) return <LoadingState />;
  return <View />;
}

function View() {
  const router = useRouter();
  const params = useSearchParams();
  const [draft, setDraftState] = useState<TripDraft | null>(() => getDraft());
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [activeDay, setActiveDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const autoSaveTried = useRef(false);

  function commit(next: TripDraft) {
    setDraft(next);
    setDraftState(next);
  }

  // Generate when the draft has no itinerary yet (never on refresh once one exists).
  const needsItinerary = Boolean(draft && !draft.itinerary && !error);
  useEffect(() => {
    if (!needsItinerary || !draft) return;
    let cancelled = false;
    requestItinerary(draft)
      .then((itinerary) => {
        if (cancelled) return;
        const next = { ...draft, itinerary, savedTripId: null };
        setDraft(next);
        setDraftState(next);
        setActiveDay(1);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // `attempt` re-triggers after "Try again".
  }, [needsItinerary, draft, attempt]);

  async function save() {
    if (!draft?.itinerary || draft.savedTripId) return;
    setSaving(true);
    setSaveError(null);
    const res = await saveTrip({
      slug: draft.destination.slug,
      days: draft.days,
      interests: draft.interests,
      itinerary: draft.itinerary,
    });
    setSaving(false);
    if (res.ok) {
      commit({ ...draft, savedTripId: res.id });
    } else if (res.reason === "auth") {
      router.push(`/login?next=${encodeURIComponent("/plan/itinerary?save=1")}`);
    } else {
      setSaveError(res.message);
    }
  }

  // Back from login with ?save=1 → save once, then clean the URL.
  const wantsAutoSave = params.get("save") === "1";
  useEffect(() => {
    if (!wantsAutoSave || autoSaveTried.current || !draft?.itinerary) return;
    autoSaveTried.current = true;
    router.replace("/plan/itinerary");
    if (!draft.savedTripId) void Promise.resolve().then(save);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the itinerary is available
  }, [wantsAutoSave, draft?.itinerary]);

  if (!draft) return <NoDraft />;

  const d = draft.destination;
  const it = draft.itinerary;

  return (
    <div className="px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[13px] font-semibold text-navy ring-1 ring-line">
          <CalendarDays className="size-3.5 text-ocean" aria-hidden />
          {draft.days} {draft.days === 1 ? "day" : "days"} · {d.name}
        </span>
        {d.score !== null && <PressureBadge score={d.score} showScore />}
      </div>
      <p className="mt-2 text-[13px] text-ink-muted">{draft.interests.join(" · ")}</p>

      {error ? (
        <ErrorState
          message={error}
          editHref={`/plan?d=${d.slug}`}
          onRetry={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : !it ? (
        <LoadingState />
      ) : (
        <>
          <h2 className="mt-4 font-display text-[26px] leading-tight font-black text-balance text-navy">{it.title}</h2>

          {!it.grounded && (
            <p className="mt-3 flex gap-2 rounded-2xl bg-sun-soft px-4 py-3 text-[13px] leading-snug text-navy">
              <Info className="mt-px size-4 shrink-0 text-pressure-mod-ink" aria-hidden />
              We don&apos;t have mapped places for {d.name} yet, so this is a general plan with suggested activities
              rather than specific venues.
            </p>
          )}

          {it.days.length > 1 && (
            <div role="tablist" aria-label="Trip days" className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 py-1">
              {it.days.map((day) => {
                const active = day.day === activeDay;
                return (
                  <button
                    key={day.day}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    aria-controls="day-panel"
                    onClick={() => setActiveDay(day.day)}
                    className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
                      active ? "bg-navy text-white" : "bg-surface text-navy ring-1 ring-line hover:bg-navy-soft"
                    }`}
                  >
                    Day {day.day}
                  </button>
                );
              })}
            </div>
          )}

          {it.days
            .filter((day) => day.day === activeDay)
            .map((day) => (
              <section key={day.day} id="day-panel" role="tabpanel" aria-label={`Day ${day.day}`} className="mt-4">
                <h3 className="mb-3 text-[15px] font-bold text-navy">
                  Day {day.day} · <span className="font-semibold text-ink-muted">{day.theme}</span>
                </h3>
                <ItineraryTimeline stops={day.stops} />
              </section>
            ))}

          {it.tips.length > 0 && (
            <section className="mt-6 rounded-3xl bg-leaf-soft p-4">
              <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-leaf-deep">
                <Leaf className="size-5" aria-hidden />
                Travel lighter
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {it.tips.map((t) => (
                  <li key={t} className="text-[14px] leading-snug text-navy/85">
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-4 flex gap-2 text-[12px] leading-snug text-ink-muted">
            <Sparkles className="mt-px size-3.5 shrink-0" aria-hidden />
            Stops and notes suggested by AI{it.grounded ? " from places mapped on Google Maps" : ""}. Ratings come from Google
            Maps. Check opening hours before you go.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => commit({ ...draft, itinerary: null, savedTripId: null })}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface text-sm font-semibold text-navy ring-1 ring-line hover:bg-navy-soft"
            >
              <RefreshCw className="size-4" aria-hidden />
              Regenerate
            </button>
            <Link
              href={`/plan?d=${d.slug}`}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface text-sm font-semibold text-navy ring-1 ring-line hover:bg-navy-soft"
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Edit preferences
            </Link>
          </div>

          <SaveBar saved={Boolean(draft.savedTripId)} saving={saving} error={saveError} onSave={save} />
        </>
      )}
    </div>
  );
}

function SaveBar({ saved, saving, error, onSave }: { saved: boolean; saving: boolean; error: string | null; onSave: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] bg-gradient-to-t from-sand via-sand/95 to-sand/0 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
      {error && (
        <p role="alert" className="mb-2 rounded-2xl bg-pressure-high-soft px-4 py-2.5 text-[13px] text-pressure-high-ink">
          {error}
        </p>
      )}
      {saved ? (
        <Link
          href="/trips"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-leaf-deep font-semibold text-white shadow-float"
        >
          <BookmarkCheck className="size-5" aria-hidden />
          Saved · View my trips
        </Link>
      ) : (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-semibold text-white shadow-float transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {saving ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
          {saving ? "Saving…" : "Save trip"}
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LOADING_COPY.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mt-5" aria-busy="true">
      <p role="status" className="flex items-center gap-2 text-[15px] font-semibold text-navy">
        <Loader2 className="size-4 animate-spin text-ocean motion-reduce:animate-none" aria-hidden />
        {LOADING_COPY[i]}
      </p>
      <p className="mt-1 text-[13px] text-ink-muted">This usually takes 15–30 seconds.</p>
      <div className="mt-5 flex flex-col gap-3">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="flex gap-3">
            <div className="size-11 shrink-0 animate-pulse rounded-2xl bg-navy-soft motion-reduce:animate-none" />
            <div className="h-24 flex-1 animate-pulse rounded-3xl bg-surface shadow-card motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry, editHref }: { message: string; onRetry: () => void; editHref: string }) {
  return (
    <div className="mt-6 rounded-3xl bg-surface p-6 text-center shadow-card">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-pressure-high-soft text-pressure-high-ink">
        <AlertCircle className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-xl font-extrabold text-navy">Itinerary not ready</h2>
      <p className="mt-1.5 text-[15px] leading-snug text-ink-muted">{message}</p>
      <p className="mt-1 text-[13px] text-ink-muted">Your choices are saved — no need to re-enter them.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy font-semibold text-white"
      >
        <RefreshCw className="size-4" aria-hidden />
        Try again
      </button>
      <Link href={editHref} className="mt-1 flex h-11 items-center justify-center text-sm font-semibold text-ocean">
        Edit preferences
      </Link>
    </div>
  );
}

function NoDraft() {
  return (
    <div className="mx-4 mt-6 rounded-3xl bg-surface p-6 text-center shadow-card">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-navy-soft text-navy">
        <CalendarDays className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-xl font-extrabold text-navy">No trip in progress</h2>
      <p className="mt-1.5 text-[15px] leading-snug text-ink-muted">Pick a destination, trip length and interests first.</p>
      <Link href="/plan" className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-navy font-semibold text-white">
        Start planning
      </Link>
    </div>
  );
}
