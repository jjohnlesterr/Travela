/**
 * Destination-aware trip interests (pure, shared by the plan form, the itinerary API and the Gemini pool).
 *
 * Google Maps categories from Apify are mostly generic ("Tourist attraction", "Restaurant"), so each
 * interest is matched against the place's category AND name. An interest is offered only when enough
 * of the destination's own places match it (or the curated catalog lists it). Gemini never decides
 * which interests exist — it only receives the ones the traveler picked.
 */
import type { Interest } from "./destinations";
import type { Place } from "./places";

export type TripInterest =
  | "Food"
  | "Culture"
  | "Nature"
  | "Shopping"
  | "Adventure"
  | "Beaches"
  | "Water Activities"
  | "Nightlife"
  | "Parks"
  | "Cafes"
  | "Scenic Spots"
  | "Museums"
  | "Heritage"
  | "Hiking"
  | "Wellness";

type Rule = {
  interest: TripInterest;
  /** Matched against "<category> <name>". */
  re: RegExp;
  /** Which place kinds can count toward this interest (lodging never does). */
  kinds: Place["kind"][];
  /** Matching places needed before the chip is offered. */
  min: number;
};

const ATTRACTION: Place["kind"][] = ["attraction"];
const FOOD: Place["kind"][] = ["food"];
const ANY: Place["kind"][] = ["attraction", "food"];

/** Order here is the tie-break order for display. */
const RULES: Rule[] = [
  { interest: "Food", re: /./, kinds: FOOD, min: 1 },
  { interest: "Nature", re: /park|falls|waterfall|mountain|\bmt\.?\s|\bhills?\b|lake|cave|river|spring|garden|forest|terrace|volcano|lagoon|sanctuary|nature|island|\bcove\b|reef|\btrees?\b/i, kinds: ATTRACTION, min: 1 },
  { interest: "Culture", re: /museum|church|cathedral|heritage|histor|monument|cultural|landmark|shrine|temple|village|mansion|kilometer zero|\bart\b|gallery/i, kinds: ATTRACTION, min: 1 },
  { interest: "Shopping", re: /market|mall|shopping|souvenir|bazaar|pasalubong|boutique|apparel/i, kinds: ANY, min: 1 },
  { interest: "Adventure", re: /\btours?\b|zip ?line|adventure|atv|rappel|canyon|cliff|jump|trek|climb|kayak|ranch|surf|div(e|ing)|campsite/i, kinds: ATTRACTION, min: 1 },
  { interest: "Beaches", re: /beach|sandbar|white sand|shore/i, kinds: ANY, min: 2 },
  { interest: "Water Activities", re: /div(e|ing)|snorkel|surf|kayak|paddle|marine|reef|sailing|boat|island hopping|water ?sport|lagoon/i, kinds: ATTRACTION, min: 1 },
  { interest: "Nightlife", re: /(?<!snack )\bbar\b|\bpub\b|night ?club|lounge|karaoke|\bktv\b|disco|tavern|restobar|live music/i, kinds: ANY, min: 3 },
  { interest: "Parks", re: /\bparks?\b|garden|plaza|botanical/i, kinds: ATTRACTION, min: 2 },
  { interest: "Cafes", re: /caf[eé]|coffee|\bbrew|bakery|bakeshop|tea ?house|dessert/i, kinds: FOOD, min: 3 },
  { interest: "Scenic Spots", re: /view|lookout|observation|viewpoint|vista|overlook|sunset|peak|summit/i, kinds: ATTRACTION, min: 1 },
  { interest: "Museums", re: /museum|gallery|exhibit/i, kinds: ATTRACTION, min: 2 },
  { interest: "Heritage", re: /church|cathedral|heritage|histor|ruins|\bfort\b|old town|ancestral|monument|shrine/i, kinds: ATTRACTION, min: 2 },
  { interest: "Hiking", re: /hik(e|ing)|trek|trail|\bmt\.?\s|mount|mountain|peak|summit|volcano|campsite/i, kinds: ATTRACTION, min: 2 },
  { interest: "Wellness", re: /\bspa\b|massage|wellness|yoga|retreat|hot spring|healing|sauna|hilot/i, kinds: ANY, min: 2 },
];

export const TRIP_INTERESTS: TripInterest[] = RULES.map((r) => r.interest);

/** Offered as fallbacks when a destination has little or no place data. */
export const UNIVERSAL_INTERESTS: TripInterest[] = ["Food", "Nature", "Culture", "Shopping", "Adventure"];

/** Food-type interests pull more eateries into the itinerary pool. */
export const FOOD_INTERESTS: TripInterest[] = ["Food", "Cafes", "Nightlife"];

const MIN_SHOWN = 4;
const MAX_SHOWN = 8;
/** A curated catalog interest counts as this many matching places. */
const CURATED_BONUS = 3;

const RULE_BY_INTEREST = new Map(RULES.map((r) => [r.interest, r]));

export function isTripInterest(v: unknown): v is TripInterest {
  return typeof v === "string" && RULE_BY_INTEREST.has(v as TripInterest);
}

/** Does this place fit the interest? (Lodging never does.) */
export function placeMatches(place: Pick<Place, "kind" | "category" | "name">, interest: TripInterest): boolean {
  const rule = RULE_BY_INTEREST.get(interest);
  return !!rule && rule.kinds.includes(place.kind) && rule.re.test(`${place.category ?? ""} ${place.name}`);
}

/**
 * Interests worth offering for a destination, most relevant first.
 * @param places  the destination's cached Apify places (may be empty)
 * @param curated hand-set catalog interests, if the destination is in the catalog
 */
export function deriveInterests(places: Place[], curated: Interest[] = []): TripInterest[] {
  const scored = RULES.map((rule, order) => {
    const count = places.filter((p) => placeMatches(p, rule.interest)).length;
    const isCurated = (curated as string[]).includes(rule.interest);
    const offered = isCurated || count >= rule.min;
    return { interest: rule.interest, order, offered, score: count + (isCurated ? CURATED_BONUS : 0) };
  });

  const shown = scored
    .filter((s) => s.offered)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, MAX_SHOWN)
    .map((s) => s.interest);

  // Thin data: pad with universal interests so there is always a reasonable choice.
  for (const i of UNIVERSAL_INTERESTS) {
    if (shown.length >= MIN_SHOWN) break;
    if (!shown.includes(i)) shown.push(i);
  }
  return shown;
}
