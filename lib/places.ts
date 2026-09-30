import type { Interest } from "./destinations";

export type PlaceKind = "lodging" | "attraction" | "food";

/** A trimmed Google Maps place (from Apify). Only what scoring and itineraries need. */
export type Place = {
  id: string;
  name: string;
  category: string | null;
  kind: PlaceKind;
  rating: number | null;
  reviews: number | null;
  lat: number;
  lng: number;
  address: string | null;
  url: string | null;
};

const LODGING = /hotel|resort|inn\b|hostel|lodg|guest ?house|villa|bed & breakfast|motel|homestay|pension|apartment|suites/i;
const FOOD =
  /restaurant|caf[eé]|coffee|bar\b|grill|bakery|eatery|food|bistro|diner|pizza|seafood|buffet|canteen|carinderia|steak|hawker|snack|burger|noodle|bbq|barbecue|kitchen/i;

/** Category first; when it is ambiguous, the search that found the place decides (checked on live Apify rows). */
export function placeKind(category: string | null, searchString: string | null): PlaceKind {
  const c = category ?? "";
  if (LODGING.test(c)) return "lodging";
  if (FOOD.test(c)) return "food";
  const s = (searchString ?? "").toLowerCase();
  if (s.includes("restaurant")) return "food";
  if (s.includes("hotel") || s.includes("resort")) return "lodging";
  return "attraction";
}

const INTEREST_PATTERNS: [Interest, RegExp][] = [
  ["Beaches", /beach|resort|island|cove|dive|snorkel|surf/i],
  ["Nature", /park|falls|waterfall|mountain|hiking|nature|lake|cave|river|garden|viewpoint|scenic|lagoon|forest|hot spring|island/i],
  ["Culture", /museum|church|historical|heritage|monument|cultural|landmark|shrine|temple|art|market/i],
  ["Adventure", /tour|dive|diving|surf|zip|adventure|kayak|trek|climb|boat|snorkel|atv/i],
];

/**
 * Best-guess interests for a destination outside the curated catalog, from what Google Maps lists there.
 * Used only for matching a greener alternative.
 */
export function interestsFromPlaces(places: Place[]): Interest[] {
  const attractions = places.filter((p) => p.kind !== "food");
  const found = INTEREST_PATTERNS.filter(([, re]) =>
    attractions.some((p) => re.test(`${p.category ?? ""} ${p.name}`)),
  ).map(([i]) => i);
  if (places.filter((p) => p.kind === "food").length >= 8) found.push("Food");
  return found.length ? found : ["Nature"];
}
