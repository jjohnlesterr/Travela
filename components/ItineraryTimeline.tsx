import { BedDouble, Compass, ExternalLink, Footprints, Star, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { ItineraryStop, StopKind } from "@/lib/itinerary";

const KIND: Record<StopKind, { icon: LucideIcon; tone: string; label: string }> = {
  attraction: { icon: Compass, tone: "bg-sky/15 text-ocean", label: "Place to visit" },
  food: { icon: UtensilsCrossed, tone: "bg-sun-soft text-pressure-mod-ink", label: "Food" },
  lodging: { icon: BedDouble, tone: "bg-navy-soft text-navy", label: "Stay" },
  activity: { icon: Footprints, tone: "bg-leaf-soft text-leaf-deep", label: "Activity" },
};

export default function ItineraryTimeline({ stops }: { stops: ItineraryStop[] }) {
  return (
    <ol className="relative flex flex-col gap-3">
      {/* rail */}
      <span className="absolute top-4 bottom-4 left-[21px] w-0.5 rounded-full bg-line" aria-hidden />
      {stops.map((s, i) => {
        const k = KIND[s.kind];
        const Icon = k.icon;
        return (
          <li key={`${s.time}-${i}`} className="relative flex gap-3">
            <span className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-2xl ring-4 ring-sand ${k.tone}`}>
              <Icon className="size-5" aria-label={k.label} />
            </span>
            <div className="min-w-0 flex-1 rounded-3xl bg-surface p-4 shadow-card">
              <p className="text-[13px] font-bold text-ocean tabular-nums">{s.time}</p>
              <h3 className="mt-0.5 font-display text-[17px] leading-snug font-extrabold text-navy">{s.name}</h3>
              {(s.category || s.rating !== null) && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-ink-muted">
                  {s.category && <span>{s.category}</span>}
                  {s.rating !== null && (
                    <span className="inline-flex items-center gap-1" title="Google Maps rating">
                      <Star className="size-3.5 fill-sun text-sun" aria-hidden />
                      <span className="tabular-nums">{s.rating.toFixed(1)}</span>
                      {s.reviews !== null && <span className="tabular-nums">({s.reviews.toLocaleString("en")})</span>}
                      <span className="sr-only">Google Maps rating</span>
                    </span>
                  )}
                </p>
              )}
              {s.note && <p className="mt-2 text-[14px] leading-snug text-navy/85">{s.note}</p>}
              <a
                href={s.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-ocean"
              >
                {s.placeId ? "View on Google Maps" : "Search the area"}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
