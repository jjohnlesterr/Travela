import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPool, ItineraryError, validateItinerary } from "./gemini";
import type { Place } from "./places";

const place = (i: number, over: Partial<Place> = {}): Place => ({
  id: `id${i}`,
  name: `Place ${i}`,
  category: "Tourist attraction",
  kind: "attraction",
  rating: 4.5,
  reviews: 100 * i,
  lat: 9 + i / 1000,
  lng: 123,
  address: null,
  url: `https://maps.example/${i}`,
  ...over,
});

const places = [
  place(1, { category: "Beach" }),
  place(2),
  place(3, { kind: "food", category: "Restaurant" }),
  place(4, { kind: "lodging", category: "Hotel" }),
];
const pool = buildPool(places, ["Beaches"]);
const input = { destination: { name: "Testville", region: "Region", country: "Philippines" }, days: 1, interests: ["Beaches" as const], pool, pressureLevel: "LOW" };

test("pool excludes lodging and ranks interest matches first", () => {
  assert.equal(pool.some((p) => p.kind === "lodging"), false);
  assert.equal(pool[0].name, "Place 1");
  assert.deepEqual(pool.map((p) => p.ref), ["p1", "p2", "p3"]);
});

test("factual fields come from the pool, not the model", () => {
  const ref = pool.find((p) => p.name === "Place 3")!.ref;
  const it = validateItinerary(
    { title: "T", tips: ["a"], days: [{ day: 1, theme: "x", stops: [{ time: "12:00", placeRef: ref, name: "Invented Name", kind: "attraction", note: "n" }] }] },
    input,
    "m",
  );
  const s = it.days[0].stops[0];
  assert.equal(s.name, "Place 3");
  assert.equal(s.kind, "food");
  assert.equal(s.rating, 4.5);
  assert.equal(s.mapsUrl, "https://maps.example/3");
  assert.equal(it.grounded, true);
});

test("unknown refs become generic stops without ratings; repeats and bad times are dropped", () => {
  const it = validateItinerary(
    {
      title: "T",
      tips: [],
      days: [
        {
          day: 1,
          theme: "x",
          stops: [
            { time: "9:00", placeRef: "p99", name: "Slow morning", kind: "activity", note: "" },
            { time: "10:00", placeRef: "p1", name: "", kind: "attraction", note: "" },
            { time: "11:00", placeRef: "p1", name: "", kind: "attraction", note: "" },
            { time: "late", placeRef: "p2", name: "", kind: "attraction", note: "" },
          ],
        },
      ],
    },
    input,
    "m",
  );
  const stops = it.days[0].stops;
  assert.equal(stops.length, 2);
  assert.deepEqual(stops[0], { ...stops[0], time: "09:00", placeId: null, rating: null, reviews: null, lat: null });
});

test("wrong day count or empty day is rejected", () => {
  assert.throws(() => validateItinerary({ title: "T", days: [], tips: [] }, input, "m"), ItineraryError);
  assert.throws(
    () => validateItinerary({ title: "T", tips: [], days: [{ day: 1, theme: "x", stops: [] }] }, input, "m"),
    ItineraryError,
  );
});

test("non-Latin-script words are stripped from model text", () => {
  const it = validateItinerary(
    { title: "T", tips: [], days: [{ day: 1, theme: "x", stops: [{ time: "08:00", placeRef: null, name: "Walk", kind: "activity", note: "Enjoy прекрасный views" }] }] },
    input,
    "m",
  );
  assert.equal(it.days[0].stops[0].note, "Enjoy views");
});
