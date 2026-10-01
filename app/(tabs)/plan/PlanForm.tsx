"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Binoculars,
  Church,
  Coffee,
  Flower2,
  Footprints,
  Frame,
  Landmark,
  Martini,
  Minus,
  Mountain,
  Plus,
  Sailboat,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  TreeDeciduous,
  Trees,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { TripInterest } from "@/lib/interests";
import { DAY_OPTIONS, isValidDays, MAX_DAYS, MIN_DAYS, type TripDestination } from "@/lib/itinerary";
import { getDraft, setDraft } from "@/lib/tripDraft";

const ICONS: Record<TripInterest, LucideIcon> = {
  Food: UtensilsCrossed,
  Culture: Landmark,
  Nature: Trees,
  Shopping: ShoppingBag,
  Adventure: Mountain,
  Beaches: Waves,
  "Water Activities": Sailboat,
  Nightlife: Martini,
  Parks: TreeDeciduous,
  Cafes: Coffee,
  "Scenic Spots": Binoculars,
  Museums: Frame,
  Heritage: Church,
  Hiking: Footprints,
  Wellness: Flower2,
};

/** `interests` = the chips relevant to this destination (lib/interests.ts), most relevant first. */
type Props = { destination: TripDestination; interests: TripInterest[] };

const noopSubscribe = () => () => {};
const isPreset = (n: number) => (DAY_OPTIONS as readonly number[]).includes(n);

/**
 * The form restores previous choices from sessionStorage (client-only), so it renders after hydration;
 * the server sends a same-size placeholder. Client-side navigations render it immediately.
 */
export default function PlanForm(props: Props) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated) return <div className="mt-6 h-[330px]" aria-hidden />;
  return <Form {...props} />;
}

function Form({ destination, interests: available }: Props) {
  const router = useRouter();
  const [previous] = useState(() => {
    const d = getDraft();
    return d?.destination.slug === destination.slug ? d : null;
  });
  const previousDays = previous?.days;
  const startDays = isValidDays(previousDays) ? previousDays : 3;
  const [days, setDays] = useState<number>(startDays);
  const [custom, setCustom] = useState(!isPreset(startDays));
  /** Raw text of the custom field, so typing "1" on the way to "12" isn't fought by clamping. */
  const [customText, setCustomText] = useState(String(startDays));
  const [interests, setInterests] = useState<TripInterest[]>(() => {
    const kept = previous?.interests.filter((i) => available.includes(i)) ?? [];
    return kept.length ? kept : available.slice(0, 2);
  });

  const customValid = !custom || isValidDays(Number(customText));
  const ready = interests.length > 0 && customValid;

  function toggle(i: TripInterest) {
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  }

  function choosePreset(n: number) {
    setCustom(false);
    setDays(n);
    setCustomText(String(n));
  }

  function setCustomDays(n: number) {
    const v = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(n)));
    setDays(v);
    setCustomText(String(v));
  }

  function onCustomInput(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    setCustomText(digits);
    const n = Number(digits);
    if (isValidDays(n)) setDays(n);
  }

  function generate() {
    if (!ready || !isValidDays(days)) return;
    setDraft({ destination, days, interests, itinerary: null, savedTripId: null });
    router.push("/plan/itinerary");
  }

  return (
    <div className="mt-6">
      <fieldset>
        <legend className="font-display text-lg font-extrabold text-navy">How many days are you staying?</legend>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {DAY_OPTIONS.map((n) => {
            const active = !custom && n === days;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={active}
                onClick={() => choosePreset(n)}
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
          <button
            type="button"
            aria-pressed={custom}
            aria-controls="custom-days"
            onClick={() => setCustom(true)}
            className={`flex h-[72px] flex-col items-center justify-center rounded-2xl transition-colors ${
              custom ? "bg-navy text-white shadow-card" : "bg-surface text-navy ring-1 ring-line hover:bg-navy-soft"
            }`}
          >
            {custom && customValid ? (
              <span className="font-display text-2xl leading-none font-black tabular-nums">{days}</span>
            ) : (
              <SlidersHorizontal className="size-[22px]" aria-hidden />
            )}
            <span className={`mt-1 text-[12px] font-semibold ${custom ? "text-white/80" : "text-ink-muted"}`}>Custom</span>
          </button>
        </div>

        {custom && (
          <div id="custom-days" className="mt-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCustomDays(days - 1)}
                disabled={days <= MIN_DAYS}
                aria-label="One day fewer"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy-soft text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-40 disabled:hover:bg-navy-soft disabled:hover:text-navy"
              >
                <Minus className="size-5" aria-hidden />
              </button>
              <label className="flex min-w-0 items-baseline justify-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customText}
                  onChange={(e) => onCustomInput(e.target.value)}
                  onBlur={() => setCustomDays(isValidDays(Number(customText)) ? Number(customText) : days)}
                  aria-label="Number of days"
                  aria-invalid={!customValid}
                  aria-describedby="custom-days-hint"
                  className="w-12 rounded-lg bg-transparent text-center font-display text-3xl font-black text-navy tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ocean"
                />
                <span className="text-[15px] font-semibold text-ink-muted">{Number(customText) === 1 ? "day" : "days"}</span>
              </label>
              <button
                type="button"
                onClick={() => setCustomDays(days + 1)}
                disabled={days >= MAX_DAYS}
                aria-label="One day more"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy-soft text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-40 disabled:hover:bg-navy-soft disabled:hover:text-navy"
              >
                <Plus className="size-5" aria-hidden />
              </button>
            </div>
            <p
              id="custom-days-hint"
              className={`mt-1.5 text-center text-[12px] ${customValid ? "text-ink-muted" : "font-semibold text-pressure-high-ink"}`}
            >
              {customValid ? `Anywhere from ${MIN_DAYS} to ${MAX_DAYS} days` : `Choose between ${MIN_DAYS} and ${MAX_DAYS} days`}
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="mt-7">
        <legend className="font-display text-lg font-extrabold text-navy">What are you into?</legend>
        <p className="mt-0.5 text-sm text-ink-muted">Picked from what {destination.name} offers. Choose one or more.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {available.map((i) => {
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
          disabled={!ready}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-semibold text-white shadow-float transition-transform active:scale-[0.98] disabled:bg-none disabled:bg-navy-soft disabled:text-navy/50 disabled:shadow-none"
        >
          <Sparkles className="size-5" aria-hidden />
          {!interests.length ? "Pick at least one interest" : !customValid ? "Choose a trip length" : `Generate my ${days}-day trip`}
        </button>
      </div>
    </div>
  );
}
