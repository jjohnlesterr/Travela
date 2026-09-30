// Run with: npm test  (node:test via tsx — no test framework installed)
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickAlternative } from "./alternatives";
import { DESTINATIONS, getDestination, pressureLevel } from "./destinations";
import type { Place } from "./places";
import { clamp, computePressure, densityFactor, popularityFactor, seasonOf } from "./pressure";
import { catalogPressure } from "./scores";

const place = (i: number, over: Partial<Place> = {}): Place => ({
  id: `p${i}`,
  name: `Place ${i}`,
  category: "Hotel",
  kind: "lodging",
  rating: 4.5,
  reviews: 100,
  lat: 10,
  lng: 120,
  address: null,
  url: null,
  ...over,
});

test("level thresholds", () => {
  assert.equal(pressureLevel(0), "LOW");
  assert.equal(pressureLevel(39), "LOW");
  assert.equal(pressureLevel(40), "MODERATE");
  assert.equal(pressureLevel(69), "MODERATE");
  assert.equal(pressureLevel(70), "HIGH");
  assert.equal(pressureLevel(100), "HIGH");
});

test("clamp", () => {
  assert.equal(clamp(-5), 0);
  assert.equal(clamp(150), 100);
  assert.equal(clamp(42), 42);
});

test("weighted formula", () => {
  const p = computePressure({
    density: 100, popularity: 100, nearby: 10, sensitivity: 100,
    peakMonths: [1], shoulderMonths: [], month: 1,
  });
  // 0.4·100 + 0.3·100 + 0.2·90 + 0.1·100 = 98
  assert.equal(p.score, 98);
  assert.equal(p.level, "HIGH");
  assert.ok(p.reasons.length >= 3 && p.reasons.length <= 4);
});

test("seasons", () => {
  assert.equal(seasonOf(1, [12, 1], [6]), "peak");
  assert.equal(seasonOf(6, [12, 1], [6]), "shoulder");
  assert.equal(seasonOf(9, [12, 1], [6]), "off");
});

test("density counts only places within the radius", () => {
  const center = { lat: 10, lng: 120 };
  const near = Array.from({ length: 18 }, (_, i) => place(i));
  const far = Array.from({ length: 18 }, (_, i) => place(100 + i, { lat: 10.5 }));
  const a = densityFactor(near, center);
  const b = densityFactor([...near, ...far], center);
  assert.equal(a.nearby, 18);
  assert.equal(b.nearby, 18);
  assert.equal(a.density, b.density);
});

test("popularity is log-scaled and bounded", () => {
  assert.equal(popularityFactor([]), 0);
  assert.equal(popularityFactor([place(1, { reviews: 10_000_000 })]), 100);
  const mid = popularityFactor(Array.from({ length: 20 }, (_, i) => place(i, { reviews: 500 })));
  assert.ok(mid > 30 && mid < 90, `mid=${mid}`);
});

test("baseline path is deterministic", () => {
  const d = getDestination("boracay")!;
  const a = catalogPressure(d, null, 9);
  const b = catalogPressure(d, null, 9);
  assert.deepEqual(a, b);
  assert.equal(a.level, "HIGH");
});

test("baseline catalog: hotspots HIGH, calmer group LOW/MODERATE (off-peak month)", () => {
  for (const slug of ["boracay", "el-nido", "coron"]) {
    assert.equal(catalogPressure(getDestination(slug)!, null, 9).level, "HIGH", slug);
  }
  for (const slug of ["siquijor", "batanes", "camiguin", "port-barton", "caramoan", "sagada"]) {
    assert.notEqual(catalogPressure(getDestination(slug)!, null, 9).level, "HIGH", slug);
  }
});

test("alternative for a hotspot is similar and at least 15 points calmer", () => {
  const month = 9;
  const selected = getDestination("boracay")!;
  const score = catalogPressure(selected, null, month).score;
  const alt = pickAlternative(
    { slug: selected.slug, score, interests: selected.interests },
    DESTINATIONS.map((d) => ({ destination: d, score: catalogPressure(d, null, month).score })),
  );
  assert.ok(alt, "expected an alternative");
  assert.ok(score - alt.score >= 15);
  assert.ok(alt.similarity >= 0.25);
  assert.equal(alt.reasons.length, 3);
});
