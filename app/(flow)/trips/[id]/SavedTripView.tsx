"use client";

import { useState } from "react";
import { ExternalLink, Leaf, Route as RouteIcon } from "lucide-react";
import DayTabs from "@/components/DayTabs";
import ItineraryTimeline from "@/components/ItineraryTimeline";
import RouteMap from "@/components/RouteMap";
import type { Itinerary } from "@/lib/itinerary";
import { formatMinutes, mapsDirectionsUrl, stopsInSavedOrder, type SavedRoute } from "@/lib/route";

type Props = { itinerary: Itinerary; route: SavedRoute | null; destinationName: string };

/** Read-only saved itinerary with the stored green-route order per day. */
export default function SavedTripView({ itinerary, route, destinationName }: Props) {
  const [active, setActive] = useState(itinerary.days[0]?.day ?? 1);
  const day = itinerary.days.find((d) => d.day === active) ?? itinerary.days[0];
  if (!day) return null;

  const ordered = stopsInSavedOrder(itinerary, route, day.day);
  const metrics = route?.perDay.find((d) => d.day === day.day) ?? null;
  // Saved routes never store the traveler's location, so links start from the first stop.
  const link = mapsDirectionsUrl(ordered, null);

  return (
    <div className="mt-5 px-4">
      <DayTabs days={itinerary.days.map((d) => d.day)} active={day.day} onChange={setActive} panelId="saved-day" />

      <section id="saved-day" role="tabpanel" aria-label={`Day ${day.day}`} className="mt-4">
        <h2 className="mb-3 text-[15px] font-bold text-navy">
          Day {day.day} · <span className="font-semibold text-ink-muted">{day.theme}</span>
        </h2>
        <ItineraryTimeline stops={day.stops} />

        {ordered.length > 0 && (
          <div className="mt-5 rounded-3xl bg-surface p-4 shadow-card">
            <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-navy">
              <RouteIcon className="size-5 text-ocean" aria-hidden />
              Green route
            </h3>
            <div className="mt-3">
              <RouteMap stops={ordered} origin={null} label={`Route for day ${day.day} in ${destinationName}`} />
            </div>
            <p className="mt-3 text-[14px] leading-snug text-navy/85">{ordered.map((s) => s.name).join(" → ")}</p>
            {metrics && (
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-muted">
                <span className="tabular-nums">{metrics.km} km</span>
                <span className="tabular-nums">{formatMinutes(metrics.minutes)}</span>
                {metrics.savedKm > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-leaf-deep tabular-nums">
                    <Leaf className="size-3.5" aria-hidden />
                    {metrics.savedKm} km saved · ~{metrics.co2SavedKg} kg CO₂ (estimate)
                  </span>
                )}
              </p>
            )}
            {link && (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-navy font-semibold text-white"
              >
                <ExternalLink className="size-5" aria-hidden />
                Open day {day.day} in Google Maps
              </a>
            )}
          </div>
        )}
      </section>

      {itinerary.tips.length > 0 && (
        <section className="mt-6 rounded-3xl bg-leaf-soft p-4">
          <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-leaf-deep">
            <Leaf className="size-5" aria-hidden />
            Travel lighter
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {itinerary.tips.map((t) => (
              <li key={t} className="text-[14px] leading-snug text-navy/85">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
