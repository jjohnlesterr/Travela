"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarDays, Clock, ExternalLink, Flag, Info, Leaf, Loader2, LocateFixed, MapPinned, Route as RouteIcon, TrendingDown } from "lucide-react";
import DayTabs from "@/components/DayTabs";
import MetricTile from "@/components/MetricTile";
import PressureBadge from "@/components/PressureBadge";
import RouteMap from "@/components/RouteMap";
import SaveTripButton from "@/components/SaveTripButton";
import { haversineKm } from "@/lib/pressure";
import {
  centroid,
  formatMinutes,
  mapsDirectionsUrl,
  MAX_ORIGIN_KM,
  planRoute,
  routeTotals,
  toSavedRoute,
  type LatLng,
  type OriginMode,
} from "@/lib/route";
import { getDraft, type TripDraft } from "@/lib/tripDraft";
import { useSaveTrip } from "@/lib/useSaveTrip";

const noopSubscribe = () => () => {};

/** The draft lives in sessionStorage, so this view renders after hydration. */
export default function RouteView() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated) return <div className="mx-4 mt-4 h-[420px] animate-pulse rounded-3xl bg-surface shadow-card" aria-hidden />;
  return <View />;
}

function View() {
  const [draft, setDraftState] = useState<TripDraft | null>(() => getDraft());
  const [mode, setMode] = useState<OriginMode>("first-stop");
  const [here, setHere] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);

  const itinerary = draft?.itinerary ?? null;
  const origin = mode === "current-location" ? here : null;
  const days = useMemo(() => (itinerary ? planRoute(itinerary, origin) : []), [itinerary, origin]);
  const totals = routeTotals(days);

  const getRoute = useCallback(() => (days.length ? toSavedRoute(days, origin ? "current-location" : "first-stop") : null), [days, origin]);
  const { save, saving, error, saved } = useSaveTrip({ draft, onSaved: setDraftState, returnPath: "/plan/route", getRoute });

  function chooseFirstStop() {
    setMode("first-stop");
    setNotice(null);
  }

  function chooseMyLocation() {
    if (!("geolocation" in navigator)) {
      setNotice("Location isn't available on this device — starting from your first stop.");
      return;
    }
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const center = centroid(days.flatMap((d) => d.stops));
        const away = center ? haversineKm(me, center) : 0;
        if (center && away > MAX_ORIGIN_KM) {
          setMode("first-stop");
          setNotice(`You're about ${Math.round(away)} km from ${draft?.destination.name} — starting from your first stop instead.`);
          return;
        }
        setHere(me);
        setMode("current-location");
      },
      () => {
        setLocating(false);
        setMode("first-stop");
        setNotice("Location unavailable — starting from your first stop.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  if (!draft || !itinerary) {
    return (
      <div className="mx-4 mt-6 rounded-3xl bg-surface p-6 text-center shadow-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-navy-soft text-navy">
          <RouteIcon className="size-6" aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold text-navy">No itinerary yet</h2>
        <p className="mt-1.5 text-[15px] leading-snug text-ink-muted">Generate an itinerary first, then we&apos;ll optimize the route.</p>
        <Link href={draft ? "/plan/itinerary" : "/plan"} className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-navy font-semibold text-white">
          {draft ? "Back to itinerary" : "Start planning"}
        </Link>
      </div>
    );
  }

  const d = draft.destination;
  const day = days.find((x) => x.day === activeDay) ?? days[0];
  const link = day ? mapsDirectionsUrl(day.stops, origin) : null;
  const anyMapped = days.some((x) => x.stops.length > 0);
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.name, d.region].filter(Boolean).join(", "))}`;

  return (
    <div className="px-4">
      <p className="text-[15px] leading-snug text-navy/85">
        We reordered each day&apos;s stops to cut back-and-forth travel. Less time in transit, lower emissions.
      </p>

      {/* Start point */}
      <div role="radiogroup" aria-label="Start each day from" className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "first-stop"}
          onClick={chooseFirstStop}
          className={`flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors ${
            mode === "first-stop" ? "bg-navy text-white" : "bg-surface text-navy ring-1 ring-line hover:bg-navy-soft"
          }`}
        >
          <Flag className="size-4" aria-hidden />
          First stop
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "current-location"}
          onClick={chooseMyLocation}
          disabled={locating || !anyMapped}
          className={`flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60 ${
            mode === "current-location" ? "bg-navy text-white" : "bg-surface text-navy ring-1 ring-line hover:bg-navy-soft"
          }`}
        >
          {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />}
          My location
        </button>
      </div>
      {notice && (
        <p role="status" className="mt-2 flex gap-2 rounded-2xl bg-sun-soft px-4 py-2.5 text-[13px] leading-snug text-navy">
          <Info className="mt-px size-4 shrink-0 text-pressure-mod-ink" aria-hidden />
          {notice}
        </p>
      )}

      {!anyMapped ? (
        <div className="mt-6 rounded-3xl bg-surface p-5 shadow-card">
          <h2 className="font-display text-lg font-extrabold text-navy">Route optimization needs mapped stops</h2>
          <p className="mt-1.5 text-[14px] leading-snug text-ink-muted">
            This itinerary uses general activities, so there are no exact places to route between yet.
          </p>
          <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-navy font-semibold text-white">
            <MapPinned className="size-5" aria-hidden />
            Open {d.name} in Google Maps
          </a>
        </div>
      ) : (
        day && (
          <>
            <div className="mt-5">
              <DayTabs days={days.map((x) => x.day)} active={day.day} onChange={setActiveDay} panelId="route-panel" />
            </div>

            <section id="route-panel" role="tabpanel" aria-label={`Day ${day.day} route`} className="mt-4">
              {day.stops.length ? (
                <RouteMap
                  stops={day.stops}
                  origin={origin}
                  label={`Route sketch for day ${day.day}: ${day.stops.map((s) => s.name).join(", then ")}`}
                />
              ) : (
                <p className="rounded-3xl bg-surface p-4 text-[14px] text-ink-muted shadow-card">No mapped stops on this day.</p>
              )}

              <ol className="mt-4 flex flex-col gap-2">
                {origin && (
                  <li className="flex items-center gap-3 text-[14px] font-semibold text-ocean">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky/15">
                      <LocateFixed className="size-4" aria-hidden />
                    </span>
                    Your location
                  </li>
                )}
                {day.stops.map((s, i) => (
                  <li key={s.placeId} className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-bold text-white tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-navy">{s.name}</span>
                  </li>
                ))}
              </ol>
              {day.unmapped.length > 0 && (
                <p className="mt-2 text-[12px] leading-snug text-ink-muted">
                  Not routed (no exact location): {day.unmapped.map((s) => s.name).join(", ")}.
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricTile icon={RouteIcon} label="Total distance" value={`${day.km} km`} hint="Estimated by road" />
                <MetricTile icon={Clock} label="Est. travel time" value={formatMinutes(day.minutes)} hint="At ~25 km/h" />
                <MetricTile
                  icon={TrendingDown}
                  label="Distance saved"
                  value={`${day.savedKm} km`}
                  hint={day.savedKm > 0 ? `vs. ${day.originalKm} km as planned` : "Already an efficient order"}
                  accent
                />
                <MetricTile icon={Leaf} label="Est. CO₂ saved" value={`${day.co2SavedKg} kg`} hint="Estimate, based on an average car" accent />
              </div>

              {link && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-navy ring-1 ring-line hover:bg-navy-soft"
                >
                  <ExternalLink className="size-5 text-ocean" aria-hidden />
                  Open day {day.day} in Google Maps
                </a>
              )}
              {link?.truncated && <p className="mt-1.5 text-center text-[12px] text-ink-muted">Google Maps shows up to 10 stops per route.</p>}
              <p className="mt-2 text-center text-[12px] leading-snug text-ink-muted">
                Times in your itinerary are approximate — follow this order to travel less.
              </p>
            </section>
          </>
        )
      )}

      {/* Trip summary */}
      <section className="mt-6 rounded-3xl bg-surface p-4 shadow-card" aria-label="Trip summary">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-extrabold text-navy">{d.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
              <CalendarDays className="size-3.5" aria-hidden />
              {draft.days} {draft.days === 1 ? "day" : "days"} · {draft.interests.join(", ")}
            </p>
          </div>
          {d.score !== null && <PressureBadge score={d.score} />}
        </div>
        {anyMapped && days.length > 1 && (
          <p className="mt-3 border-t border-line pt-3 text-[13px] text-navy/85">
            Whole trip: <strong className="tabular-nums">{totals.km} km</strong> · {formatMinutes(totals.minutes)} of travel ·{" "}
            <strong className="text-leaf-deep tabular-nums">{totals.savedKm} km saved</strong>
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] bg-gradient-to-t from-sand via-sand/95 to-sand/0 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {error && (
          <p role="alert" className="mb-2 rounded-2xl bg-pressure-high-soft px-4 py-2.5 text-[13px] text-pressure-high-ink">
            {error}
          </p>
        )}
        <SaveTripButton saved={saved} saving={saving} onSave={save} />
      </div>
    </div>
  );
}
