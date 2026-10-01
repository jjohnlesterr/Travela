"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { LatLng } from "@/lib/route";

export type MapStop = LatLng & { name: string; n: number };

type Props = { stops: MapStop[]; origin: LatLng | null; label: string };

/** Fallback only; the line color is read from the --color-ocean token at draw time. */
const OCEAN = "#1668b8";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function pin(n: number, first: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<span class="flex size-[30px] items-center justify-center rounded-full border-[2.5px] border-white ${
      first ? "bg-leaf-deep" : "bg-navy"
    } font-sans text-[13px] font-bold text-white tabular-nums shadow-float">${n}</span>`,
  });
}

const originPin = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<span class="flex size-[22px] items-center justify-center rounded-full border-[3px] border-ocean bg-white shadow-card"><span class="size-2 rounded-full bg-ocean"></span></span>`,
});

/**
 * Real map preview (OpenStreetMap tiles + Leaflet). Loaded client-only via components/RouteMap.tsx.
 * The dotted line joins stops in visiting order — it is not road geometry.
 */
export default function LeafletRouteMap({ stops, origin, label }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const m = L.map(el.current, {
      zoomAnimation: !reduceMotion,
      fadeAnimation: !reduceMotion,
      markerZoomAnimation: !reduceMotion,
      scrollWheelZoom: false,
      // One-finger drags keep scrolling the page on phones; pinch still zooms.
      dragging: !L.Browser.mobile,
      zoomSnap: 0.5,
      attributionControl: true,
    });
    m.attributionControl.setPrefix(false);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();

    const points: L.LatLngExpression[] = [...(origin ? [origin] : []), ...stops].map((p) => [p.lat, p.lng]);
    if (points.length > 1) {
      const color = getComputedStyle(document.documentElement).getPropertyValue("--color-ocean").trim() || OCEAN;
      L.polyline(points, { color, weight: 4, opacity: 0.85, dashArray: "1 9", lineCap: "round" }).addTo(g);
    }
    if (origin) L.marker([origin.lat, origin.lng], { icon: originPin, title: "Your location", keyboard: false }).addTo(g);
    stops.forEach((s, i) => {
      L.marker([s.lat, s.lng], { icon: pin(s.n, i === 0 && !origin), title: `${s.n}. ${s.name}`, riseOnHover: true })
        .bindTooltip(`${s.n}. ${escapeHtml(s.name)}`, { direction: "top", offset: [0, -16] })
        .addTo(g);
    });

    m.invalidateSize();
    if (points.length === 1) m.setView(points[0], 15);
    else if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
  }, [stops, origin]);

  // `isolate` keeps Leaflet's high z-index panes/controls below the app's sticky bars and bottom nav.
  return <div ref={el} role="region" aria-label={label} className="travela-map isolate h-[240px] w-full bg-navy-soft" />;
}
