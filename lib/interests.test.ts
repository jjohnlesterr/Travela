import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveInterests, isTripInterest, placeMatches, UNIVERSAL_INTERESTS } from "./interests";
import type { Place, PlaceKind } from "./places";

let n = 0;
const place = (name: string, kind: PlaceKind = "attraction", category = "Tourist attraction"): Place => ({
  id: `p${++n}`,
  name,
  category,
  kind,
  rating: 4.5,
  reviews: 100,
  lat: 10,
  lng: 120,
  address: null,
  url: null,
});

// Real names from the cached Baguio / Boracay Apify rows.
const BAGUIO = [
  place("Mines View Observation Deck"),
  place("Wright Park"),
  place("Baguio Mansion House : The Presidential Museum"),
  place("Wright Park Kiosk"),
  place("Pacdal Circle Park"),
  place("Big Belly Restaurant", "food", "Restaurant"),
  place("BULALO Restaurant-Miners' Cabin Cafe", "food", "Restaurant"),
  place("Sidung Cafe and Tavern", "food", "Restaurant"),
  place("Velvet Café and Restaurant", "food", "Restaurant"),
  place("Some Hotel", "lodging", "Hotel"),
];

const BORACAY = [
  place("Bulabog Beach"),
  place("Diniwid Beach"),
  place("Tambisaan Beach"),
  place("Milky's Helmet Diving Place"),
  place("Willy's Rock"),
  place("Happiness Restaurant & Bar Boracay", "food", "Restaurant"),
  place("Chill Out Restaurant & Live Sport Bar", "food", "Restaurant"),
  place("Ozzy's Bar & Restaurant", "food", "Restaurant"),
  place("Beach Resort", "lodging", "Resort hotel"),
];

test("Baguio: no beaches, highland interests derived from places", () => {
  const got = deriveInterests(BAGUIO, ["Culture", "Food", "Nature"]);
  assert.ok(!got.includes("Beaches"));
  for (const i of ["Nature", "Food", "Culture", "Parks", "Cafes", "Scenic Spots"] as const) assert.ok(got.includes(i), i);
});

test("Boracay: beach, water and nightlife interests appear", () => {
  const got = deriveInterests(BORACAY, ["Beaches", "Food", "Adventure"]);
  for (const i of ["Beaches", "Water Activities", "Nightlife", "Food"] as const) assert.ok(got.includes(i), i);
});

test("generic categories alone do not trigger interests", () => {
  // "Tourist attraction" must not count as a tour (Adventure); "Chill" is not a hill; snack bars aren't nightlife.
  assert.equal(placeMatches(place("Chill Spot"), "Adventure"), false);
  assert.equal(placeMatches(place("Chill Spot"), "Nature"), false);
  assert.equal(placeMatches(place("Stop & Snack Bar", "food", "Snack bar"), "Nightlife"), false);
  assert.equal(placeMatches(place("Beachfront Hotel", "lodging", "Hotel"), "Beaches"), false);
});

test("no place data falls back to universal interests", () => {
  assert.deepEqual(deriveInterests([]), UNIVERSAL_INTERESTS.slice(0, 4));
});

test("curated catalog interests are kept even with thin data", () => {
  const got = deriveInterests([], ["Beaches", "Nature"]);
  assert.ok(got.includes("Beaches") && got.includes("Nature"));
  assert.ok(got.length >= 4);
});

test("never more than 8 chips", () => {
  const many = [
    ...BAGUIO,
    ...BORACAY,
    place("Old Church"),
    place("Heritage Shrine"),
    place("Night Market"),
    place("Mt. Hiking Trail"),
    place("Mountain Peak Trek"),
    place("Hot Spring Spa"),
    place("Wellness Spa Retreat"),
    place("Art Museum"),
    place("History Museum"),
  ];
  assert.ok(deriveInterests(many).length <= 8);
});

test("isTripInterest validates labels", () => {
  assert.equal(isTripInterest("Scenic Spots"), true);
  assert.equal(isTripInterest("Casinos"), false);
  assert.equal(isTripInterest(3), false);
});
