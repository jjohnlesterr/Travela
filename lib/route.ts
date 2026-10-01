/**
 * Green route: lightweight per-day stop ordering (pure, no paid APIs).
 * Straight-line distance × road factor, nearest-neighbour from a fixed start, then 2-opt.
 * Real navigation is handed to Google Maps via a deep link.
 */
import type { Itinerary, ItineraryStop } from "./itinerary";
import { haversineKm } from "./pressure";

export const ROAD_FACTOR = 1.3;
export const AVG_KMH = 25;
/** Average car, kg CO₂ per km — labelled as an estimate in the UI. */
export const CO2_KG_PER_KM = 0.17;
/** Google Maps directions links accept at most 8 waypoints (plus origin and destination). */
export const MAX_WAYPOINTS = 8;
/** A current location further than this from the day's stops isn't a sensible start. */
export const MAX_ORIGIN_KM = 50;

export type LatLng = { lat: number; lng: number };
export type MappedStop = ItineraryStop & LatLng & { placeId: string };

export type OriginMode = "first-stop" | "current-location";

export type DayRoute = {
  day: number;
  /** Mapped stops in optimized visiting order. */
  stops: MappedStop[];
  /** Stops without coordinates (generic activities) — kept in the itinerary, excluded from routing. */
  unmapped: ItineraryStop[];
  originalKm: number;
  km: number;
  savedKm: number;
  minutes: number;
  co2SavedKg: number;
};

export type RouteTotals = { km: number; savedKm: number; minutes: number; co2SavedKg: number };

/** What gets stored with a saved trip (never the user's coordinates). */
export type SavedRoute = {
  origin: OriginMode;
  perDay: { day: number; order: string[]; km: number; minutes: number; savedKm: number; co2SavedKg: number }[];
  totals: RouteTotals;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const legKm = (a: LatLng, b: LatLng) => haversineKm(a, b) * ROAD_FACTOR;

/** Open path length (no return leg), optionally starting from an external origin. */
export function pathKm(points: LatLng[], origin?: LatLng | null) {
  const seq = origin ? [origin, ...points] : points;
  let km = 0;
  for (let i = 1; i < seq.length; i++) km += legKm(seq[i - 1], seq[i]);
  return km;
}

function nearestNeighbour<T extends LatLng>(start: LatLng, rest: T[]): T[] {
  const left = [...rest];
  const out: T[] = [];
  let cur = start;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (legKm(cur, left[i]) < legKm(cur, left[best])) best = i;
    const next = left.splice(best, 1)[0];
    out.push(next);
    cur = next;
  }
  return out;
}

/** 2-opt on an open path whose first element (index 0) is fixed. */
function twoOpt<T extends LatLng>(path: T[]): T[] {
  let best = [...path];
  let improved = true;
  for (let guard = 0; improved && guard < 50; guard++) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        if (pathKm(candidate) + 1e-9 < pathKm(best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

/**
 * Orders mapped stops to reduce travel. With no origin the day starts at its first planned stop;
 * with an origin (current location) every stop can move. Never returns a longer route than planned.
 */
export function optimizeStops<T extends LatLng>(stops: T[], origin: LatLng | null): { order: T[]; originalKm: number; km: number } {
  const originalKm = pathKm(stops, origin);
  if (stops.length < 3 && !origin) return { order: stops, originalKm, km: originalKm };

  let order: T[];
  if (origin) {
    // Treat the origin as a fixed virtual first node.
    const virtual = { ...origin, __origin: true } as unknown as T;
    order = twoOpt([virtual, ...nearestNeighbour(origin, stops)]).slice(1);
  } else {
    order = twoOpt([stops[0], ...nearestNeighbour(stops[0], stops.slice(1))]);
  }
  const km = pathKm(order, origin);
  return km < originalKm ? { order, originalKm, km } : { order: stops, originalKm, km: originalKm };
}

const isMapped = (s: ItineraryStop): s is MappedStop => s.lat !== null && s.lng !== null && s.placeId !== null;

export function centroid(points: LatLng[]): LatLng | null {
  if (!points.length) return null;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
}

export function planRoute(itinerary: Itinerary, origin: LatLng | null): DayRoute[] {
  return itinerary.days.map((day) => {
    const mapped = day.stops.filter(isMapped);
    const { order, originalKm, km } = optimizeStops(mapped, origin);
    const savedKm = Math.max(0, originalKm - km);
    return {
      day: day.day,
      stops: order,
      unmapped: day.stops.filter((s) => !isMapped(s)),
      originalKm: round1(originalKm),
      km: round1(km),
      savedKm: round1(savedKm),
      minutes: Math.round((km / AVG_KMH) * 60),
      co2SavedKg: round1(savedKm * CO2_KG_PER_KM),
    };
  });
}

export function routeTotals(days: DayRoute[]): RouteTotals {
  return {
    km: round1(days.reduce((s, d) => s + d.km, 0)),
    savedKm: round1(days.reduce((s, d) => s + d.savedKm, 0)),
    minutes: days.reduce((s, d) => s + d.minutes, 0),
    co2SavedKg: round1(days.reduce((s, d) => s + d.co2SavedKg, 0)),
  };
}

export function toSavedRoute(days: DayRoute[], origin: OriginMode): SavedRoute {
  return {
    origin,
    perDay: days.map((d) => ({
      day: d.day,
      order: d.stops.map((s) => s.placeId),
      km: d.km,
      minutes: d.minutes,
      savedKm: d.savedKm,
      co2SavedKg: d.co2SavedKg,
    })),
    totals: routeTotals(days),
  };
}

/** Restores a saved day's order from the itinerary's own stop data. */
export function stopsInSavedOrder(itinerary: Itinerary, route: SavedRoute | null, day: number): MappedStop[] {
  const stops = itinerary.days.find((d) => d.day === day)?.stops.filter(isMapped) ?? [];
  const order = route?.perDay.find((d) => d.day === day)?.order;
  if (!order) return stops;
  const byId = new Map(stops.map((s) => [s.placeId, s]));
  return order.map((id) => byId.get(id)).filter((s): s is MappedStop => Boolean(s));
}

const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/**
 * Google Maps directions deep link (opens the Maps app on phones). Truncates to 8 waypoints.
 * A single stop with no origin links directions to it from wherever the traveler is (Maps picks the start).
 */
export function mapsDirectionsUrl(stops: LatLng[], origin: LatLng | null): { url: string; truncated: boolean } | null {
  const points = origin ? [origin, ...stops] : stops;
  if (!stops.length) return null;
  if (points.length === 1) {
    const params = new URLSearchParams({ api: "1", destination: fmt(points[0]), travelmode: "driving" });
    return { url: `https://www.google.com/maps/dir/?${params.toString()}`, truncated: false };
  }
  const first = points[0];
  const last = points[points.length - 1];
  const middle = points.slice(1, -1);
  const truncated = middle.length > MAX_WAYPOINTS;
  const params = new URLSearchParams({ api: "1", origin: fmt(first), destination: fmt(last), travelmode: "driving" });
  if (middle.length) params.set("waypoints", middle.slice(0, MAX_WAYPOINTS).map(fmt).join("|"));
  return { url: `https://www.google.com/maps/dir/?${params.toString()}`, truncated };
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
