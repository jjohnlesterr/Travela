import { test } from "node:test";
import assert from "node:assert/strict";
import type { Itinerary, ItineraryStop } from "./itinerary";
import { mapsDirectionsUrl, optimizeStops, pathKm, planRoute, routeTotals, stopsInSavedOrder, toSavedRoute } from "./route";

const pt = (lat: number, lng: number, id = `${lat},${lng}`) => ({ lat, lng, id });

test("optimizer never makes a route longer and fixes the first stop", () => {
  // Zig-zag along a line: 0, 3, 1, 4, 2 (km-ish apart)
  const stops = [0, 3, 1, 4, 2].map((x) => pt(10, 120 + x * 0.01));
  const { order, originalKm, km } = optimizeStops(stops, null);
  assert.equal(order[0], stops[0]);
  assert.ok(km < originalKm);
  assert.deepEqual(
    order.map((s) => s.lng),
    [0, 1, 2, 3, 4].map((x) => 120 + x * 0.01),
  );
});

test("already-optimal order is kept with zero savings", () => {
  const stops = [0, 1, 2, 3].map((x) => pt(10, 120 + x * 0.01));
  const { order, originalKm, km } = optimizeStops(stops, null);
  assert.deepEqual(order, stops);
  assert.equal(km, originalKm);
});

test("origin is not part of the returned order", () => {
  const stops = [3, 1, 2].map((x) => pt(10, 120 + x * 0.01));
  const { order, km } = optimizeStops(stops, { lat: 10, lng: 120 });
  assert.equal(order.length, 3);
  assert.deepEqual(order.map((s) => s.lng), [1, 2, 3].map((x) => 120 + x * 0.01));
  assert.ok(Math.abs(km - pathKm(order, { lat: 10, lng: 120 })) < 1e-9);
});

const stop = (id: string | null, lat: number | null, lng: number | null): ItineraryStop => ({
  time: "09:00", placeId: id, name: id ?? "generic", kind: "attraction", note: "",
  lat, lng, category: null, rating: null, reviews: null, mapsUrl: "",
});

const itinerary: Itinerary = {
  title: "t", tips: [], grounded: true, model: "m", generatedAt: "",
  days: [{ day: 1, theme: "x", stops: [stop("a", 10, 120), stop("c", 10, 120.03), stop(null, null, null), stop("b", 10, 120.01), stop("d", 10, 120.02)] }],
};

test("planRoute excludes unmapped stops and computes metrics", () => {
  const [d] = planRoute(itinerary, null);
  assert.deepEqual(d.stops.map((s) => s.placeId), ["a", "b", "d", "c"]);
  assert.equal(d.unmapped.length, 1);
  assert.ok(d.savedKm > 0);
  assert.ok(d.co2SavedKg >= 0);
  assert.equal(routeTotals([d]).km, d.km);
});

test("saved route round-trips the order without storing coordinates", () => {
  const saved = toSavedRoute(planRoute(itinerary, null), "first-stop");
  assert.equal(JSON.stringify(saved).includes("120.0"), false);
  assert.deepEqual(stopsInSavedOrder(itinerary, saved, 1).map((s) => s.placeId), ["a", "b", "d", "c"]);
});

test("maps link: origin/destination/waypoints and 8-waypoint cap", () => {
  const pts = Array.from({ length: 12 }, (_, i) => ({ lat: 10, lng: 120 + i / 100 }));
  const r = mapsDirectionsUrl(pts, null)!;
  const u = new URL(r.url);
  assert.equal(u.searchParams.get("waypoints")!.split("|").length, 8);
  assert.equal(r.truncated, true);
  assert.equal(mapsDirectionsUrl([], null), null);
  assert.equal(mapsDirectionsUrl([], pts[0]), null);
});

test("maps link: stop order is preserved and current location is the origin", () => {
  const a = { lat: 16.41, lng: 120.61 };
  const b = { lat: 16.42, lng: 120.62 };
  const c = { lat: 16.43, lng: 120.63 };
  const me = { lat: 16.4, lng: 120.6 };
  const u = new URL(mapsDirectionsUrl([a, b, c], me)!.url);
  assert.equal(u.origin + u.pathname, "https://www.google.com/maps/dir/");
  assert.equal(u.searchParams.get("api"), "1");
  assert.equal(u.searchParams.get("origin"), "16.400000,120.600000");
  assert.equal(u.searchParams.get("waypoints"), "16.410000,120.610000|16.420000,120.620000");
  assert.equal(u.searchParams.get("destination"), "16.430000,120.630000");
});

test("maps link: a single stop still gets directions (Maps chooses the start)", () => {
  const u = new URL(mapsDirectionsUrl([{ lat: 11.96, lng: 121.92 }], null)!.url);
  assert.equal(u.searchParams.get("destination"), "11.960000,121.920000");
  assert.equal(u.searchParams.get("origin"), null);
  assert.equal(u.searchParams.get("waypoints"), null);
});
