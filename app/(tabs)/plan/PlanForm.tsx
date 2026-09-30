"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Mountain, Sparkles, Trees, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import { INTERESTS, type Interest } from "@/lib/destinations";
import { DAY_OPTIONS, type TripDestination } from "@/lib/itinerary";
import { getDraft, setDraft } from "@/lib/tripDraft";

const ICONS: Record<Interest, LucideIcon> = {
  Beaches: Waves,
  Nature: Trees,
  Food: UtensilsCrossed,
  Culture: Landmark,
  Adventure: Mountain,
};

type Props = { destination: TripDestination; suggestedInterests: Interest[] };

const noopSubscribe = () => () => {};

/**
 * The form restores previous choices from sessionStorage (client-only), so it renders after hydration;
 * the server sends a same-size placeholder. Client-side navigations render it immediately.
 */
export default function PlanForm(props: Props) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated) return <div className="mt-6 h-[330px]" aria-hidden />;
  return <Form {...props} />;
}

function Form({ destination, suggestedInterests }: Props) {
  const router = useRouter();
  const [previous] = useState(() => {
    const d = getDraft();
    return d?.destination.slug === destination.slug ? d : null;
  });
  const [days, setDays] = useState<number>(previous?.days ?? 3);
  const [interests, setInterests] = useState<Interest[]>(
    previous?.interests ?? (suggestedInterests.length ? suggestedInterests.slice(0, 2) : ["Nature"]),
  );

  function toggle(i: Interest) {
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  }

  function generate() {
    setDraft({ destination, days, interests, itinerary: null, savedTripId: null });
    router.push("/plan/itinerary");
  }

  return (
    <div className="mt-6">
      <fieldset>
        <legend className="font-display text-lg font-extrabold text-navy">How many days are you staying?</legend>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {DAY_OPTIONS.map((n) => {
            const active = n === days;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={active}
                onClick={() => setDays(n)}
                className={`flex h-[72px] flex-col items-center justify-center rounded-2xl transition-colors ${
                  active ? "bg-navy text-white shadow-card" : "bg-surface text-navy ring-1 ring-line hover:bg-navy-soft"
                }`}
              >
                <span className="font-display text-2xl leading-none font-black tabular-nums">{n}</span>
                <span className={`mt-1 text-[12px] font-semibold ${active ? "text-white/80" : "text-ink-muted"}`}>
                  {n === 1 ? "Day" : "Days"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="font-display text-lg font-extrabold text-navy">What are you into?</legend>
        <p className="mt-0.5 text-sm text-ink-muted">Pick one or more.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const active = interests.includes(i);
            const Icon = ICONS[i];
            return (
              <button
                key={i}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(i)}
                className={`flex h-11 items-center gap-2 rounded-full pr-4 pl-3.5 text-[15px] font-semibold transition-colors ${
                  active ? "bg-leaf-soft text-leaf-deep ring-2 ring-leaf" : "bg-surface text-navy ring-1 ring-line hover:bg-navy-soft"
                }`}
              >
                <Icon className="size-[18px]" aria-hidden />
                {i}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+92px)] z-20 -mx-4 mt-8 bg-gradient-to-t from-sand via-sand/95 to-sand/0 px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={generate}
          disabled={interests.length === 0}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-semibold text-white shadow-float transition-transform active:scale-[0.98] disabled:bg-none disabled:bg-navy-soft disabled:text-navy/50 disabled:shadow-none"
        >
          <Sparkles className="size-5" aria-hidden />
          {interests.length ? "Generate my trip" : "Pick at least one interest"}
        </button>
      </div>
    </div>
  );
}
