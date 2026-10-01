import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY_OPTIONS, isValidDays, MAX_DAYS, MIN_DAYS } from "./itinerary";

test("trip length: presets and every custom value from 1 to 14 are accepted", () => {
  for (const n of DAY_OPTIONS) assert.equal(isValidDays(n), true);
  for (let n = MIN_DAYS; n <= MAX_DAYS; n++) assert.equal(isValidDays(n), true, String(n));
  assert.equal(MAX_DAYS, 14);
});

test("trip length: out-of-range, fractional and non-numeric values are rejected", () => {
  for (const v of [0, -1, 15, 99, 4.5, Number.NaN, Infinity, "4", null, undefined]) assert.equal(isValidDays(v), false, String(v));
});
