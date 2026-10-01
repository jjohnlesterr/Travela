"use client";

import { Component, useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { MapPinOff } from "lucide-react";
import type { LatLng } from "@/lib/route";
import type { MapStop } from "./LeafletRouteMap";
import RouteSketch from "./RouteSketch";

// Leaflet touches `window` on import, so the map is client-only and its code (and CSS) loads only where a map renders.
const LeafletRouteMap = dynamic(() => import("./LeafletRouteMap"), {
  ssr: false,
  loading: () => <div className="h-[240px] w-full animate-pulse bg-navy-soft" aria-hidden />,
});

type Stop = { lat: number | null; lng: number | null; name: string };
type Props = { stops: Stop[]; origin: LatLng | null; label: string };

const validCoord = (lat: unknown, lng: unknown): boolean =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180 &&
  !(lat === 0 && lng === 0);

/** If the map chunk fails to load or Leaflet throws, show the lightweight SVG sketch instead. */
class MapBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Green Route map preview: numbered stops in visiting order on an OpenStreetMap base map.
 * Stops without valid coordinates are left off the map (numbers still match the list) and never invented.
 */
export default function RouteMap({ stops, origin, label }: Props) {
  // Stable identity per day/origin so the map only refits when the route actually changes.
  const key = JSON.stringify([stops.map((s) => [s.lat, s.lng, s.name]), origin]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mapped = useMemo<MapStop[]>(() => stops.flatMap((s, i) => (validCoord(s.lat, s.lng) ? [{ lat: s.lat!, lng: s.lng!, name: s.name, n: i + 1 }] : [])), [key]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const from = useMemo(() => (origin && validCoord(origin.lat, origin.lng) ? origin : null), [key]);

  if (!mapped.length) {
    return (
      <p className="flex items-center gap-2 rounded-3xl bg-surface p-4 text-[14px] text-ink-muted shadow-card">
        <MapPinOff className="size-4 shrink-0" aria-hidden />
        No exact locations to show on the map for this day.
      </p>
    );
  }

  return (
    <figure>
      <div className="overflow-hidden rounded-3xl shadow-card ring-1 ring-line">
        <MapBoundary fallback={<RouteSketch stops={mapped} origin={from} label={label} />}>
          <LeafletRouteMap stops={mapped} origin={from} label={label} />
        </MapBoundary>
      </div>
      <figcaption className="mt-1.5 px-1 text-[12px] leading-snug text-ink-muted">
        Dotted line shows the visiting order, not exact roads.
        {mapped.length < stops.length && " Stops without an exact location aren't shown."}
      </figcaption>
    </figure>
  );
}
