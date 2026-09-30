# Travela — Implementation Plan

> Hackathon practice project. **Simple + working beats complex + perfect.**
> Maximum 4 phases. Never sacrifice P0 for P2. This document is the source of truth — if a detail is decided here, do not re-ask; build it.

---

## 0. Current codebase snapshot (as of plan creation)

| Item | State |
|---|---|
| Framework | **Next.js 16.3.7** (App Router, **Turbopack is the default bundler**), React 19.2.8, TypeScript 5 |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` in `app/globals.css`, no `tailwind.config`) |
| App code | Untouched `create-next-app` boilerplate: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/favicon.ico` |
| Path alias | `@/*` → project root (no `src/`) |
| Dependencies | `next`, `react`, `react-dom`, **`next-pwa@5.6.0` (uncommitted, see decision below)**. No Supabase, no Gemini SDK. `sharp` is present transitively. |
| Assets | `public/images/travela-logo.png` — 1780×490-ish horizontal wordmark (emblem left + "Travelá" wordmark), ~518 KB, transparent background |
| PixelCrew | `.pixel-agents/` — orchestrator + frontend/backend/database/security/performance/qa agent definitions, skill notes, local dashboard (port 4747). Profile auto-detected as generic Next.js/SQL; it does **not** know about Supabase yet. |
| Impeccable | v4.3.1 in `.claude/skills/impeccable` and `.agents/skills/impeccable`, subagents in `.claude/agents/impeccable-*.md`, PostToolUse + Stop hooks in `.claude/settings.local.json` / `.codex/hooks.json`. No `PRODUCT.md` / `DESIGN.md` yet. |
| Agent notes | `AGENTS.md`: Next 16 has breaking changes — read `node_modules/next/dist/docs/` before writing Next-specific code. |

### Decisions forced by the snapshot

1. **Remove `next-pwa`.** It is a webpack plugin (workbox-webpack-plugin 6, last released 2022) and Next 16 builds with Turbopack by default. Use the Next-native approach from `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`: `app/manifest.ts` + a small hand-written `public/sw.js`. Run `npm uninstall next-pwa`.
2. **`middleware.ts` is deprecated → use `proxy.ts`** (export `function proxy`) for the Supabase session refresh. See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
3. **`cookies()` / `headers()` / route `params` / `searchParams` are async** — always `await` them.
4. **Logo is a wide wordmark**, unsuitable as an app icon. PWA icons are produced by **cropping the existing emblem** (the circular left part) — not redrawing it. Header uses the full wordmark unchanged.

---

## 1. Project overview

Travela is a mobile-first sustainable travel recommendation PWA. A user searches a destination, sees an **Estimated Tourism Pressure** score (0–100) with plain-language reasons, is offered a **similar lower-pressure alternative** when appropriate, picks trip length + interests, gets a **Gemini-generated itinerary**, sees a **green-route-optimized** stop order with distance/time savings, opens it in **Google Maps**, and **saves** the trip.

**Hard rule:** Travela never claims to know real tourist counts. Always say **"Estimated Tourism Pressure"**. Never "current tourists", "crowd count", "live visitors".

**Tone rule:** popular destinations are not "bad". Copy encourages ("A calmer option with a similar vibe"), never shames ("Avoid Boracay").

## 2. MVP objective

A judge, on a phone, can go Home → search "Boracay" → see 7x/100 HIGH with reasons → tap the Siquijor alternative → pick 3 days + Beaches/Nature → get an itinerary in <15 s → see an optimized route with km saved → open Google Maps → log in → save → see it in Trips. All without a crash, even if one external API is down.

## 3. User flow

```
Home ─search─▶ Destination Analysis (/d/[slug])
                 ├─ Weather strip (optional)
                 ├─ Estimated Tourism Pressure card + reasons
                 └─ Greener Alternative card ──"Plan a trip here"──┐
                 └─ "Plan this trip" ─────────────────────────────┤
                                                                   ▼
                                           Trip Preferences (/plan?d=slug)
                                                                   │ "Generate My Trip"
                                                                   ▼
                                           AI Itinerary (/plan/itinerary)
                                                                   │ "Optimize route"
                                                                   ▼
                                     Green Route + Trip Summary (/plan/route)
                                        ├─ "Open in Google Maps"
                                        └─ "Save Trip" ─(login if needed)─▶ Trips (/trips)
```

## 4. Feature scope

**In scope:** Home, Explore, destination search, Destination Analysis, pressure score, greener alternative, trip preferences, Gemini itinerary, route optimization (client-side heuristic), geolocation origin, Google Maps deep links, email+password auth, saved trips (list/detail/delete), simple profile, PWA install, Capacitor-ready structure.

**Out of scope (do not build):** social features, reviews, booking/payments, push notifications, multi-language, dark mode, desktop layouts, admin panels, editing itineraries stop-by-stop, real-time crowd data, user-uploaded photos, password reset flow (unless trivial), a full map SDK.

## 5. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 App Router, TypeScript, React 19 |
| Styling | Tailwind v4 tokens in `app/globals.css` (`@theme`) |
| Fonts | `next/font/google`: **Nunito** (display, 700/800 — echoes the rounded logo wordmark) + **DM Sans** (body/UI) |
| Icons | `lucide-react` (tree-shaken, tiny) |
| DB/Auth | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| AI | Gemini REST API via `fetch` (no SDK), JSON mode |
| Places data | Apify actor `compass/crawler-google-places` via `run-sync-get-dataset-items` |
| Weather | Open-Meteo forecast API (no key) + Open-Meteo geocoding API (no key) for unknown destinations |
| Location | `navigator.geolocation` (on demand only) |
| Navigation | Google Maps URL deep links (`https://www.google.com/maps/dir/?api=1...`) |
| Map visual | Hand-rolled **SVG mini-map** (projected lat/lng polyline). No Leaflet/Mapbox/Google JS SDK. |
| PWA | `app/manifest.ts` + `public/sw.js` (hand-written) |
| APK (later) | Capacitor pointing at the deployed URL |

New dependencies allowed: `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `tsx` (dev, for the warm-cache script). Anything else needs a real reason.

## 6. Architecture

```
app/
  layout.tsx                 # fonts, metadata, viewport (themeColor, viewport-fit=cover), SW register
  manifest.ts                # PWA manifest
  globals.css                # Tailwind v4 + design tokens
  (tabs)/                    # route group: screens WITH floating bottom nav
    layout.tsx               # <main> + <BottomNav/> + safe-area padding
    page.tsx                 # Home  "/"
    explore/page.tsx         # Explore
    trips/page.tsx           # Saved trips list (auth-gated content)
    trips/[id]/page.tsx      # Saved trip detail
    profile/page.tsx         # Profile
  (flow)/                    # route group: focused flow screens with top back-bar, bottom nav hidden
    layout.tsx
    d/[slug]/page.tsx        # Destination Analysis + Greener Alternative
    d/[slug]/loading.tsx     # skeleton while Apify/cache resolves
    plan/page.tsx            # Trip Preferences (?d=slug) — also the center "Plan" nav target
    plan/itinerary/page.tsx  # AI Itinerary (client)
    plan/route/page.tsx      # Green Route + Trip Summary (client)
    login/page.tsx           # Email + password (sign in / sign up toggle)
  api/
    itinerary/route.ts       # POST → Gemini
    trips/route.ts           # POST save, GET list (or use server actions — pick server actions if simpler)
  offline/page.tsx           # static offline fallback
components/                  # flat folder, no deep hierarchy
  BottomNav.tsx  TopBar.tsx  SearchBar.tsx  DestinationCard.tsx
  PressureGauge.tsx  PressureBadge.tsx  ReasonList.tsx  AlternativeCard.tsx
  WeatherStrip.tsx  Chip.tsx  DurationPicker.tsx  InterestPicker.tsx
  ItineraryTimeline.tsx  RouteMap.tsx  MetricTile.tsx  Button.tsx  Skeleton.tsx  EmptyState.tsx
lib/
  destinations.ts            # seed catalog (source of truth for curated destinations)
  pressure.ts                # deterministic scoring + reason generation (pure functions)
  alternatives.ts            # similarity + pick alternative (pure)
  apify.ts                   # fetch + trim places
  weather.ts                 # Open-Meteo forecast + geocoding
  gemini.ts                  # prompt + JSON call + validation
  route.ts                   # haversine, nearest-neighbor + 2-opt, metrics, Maps URL
  analysis.ts                # getAnalysis(slug): cache → Apify → baseline fallback; composes everything
  tripDraft.ts               # sessionStorage draft (destination, days, interests, itinerary, route)
  supabase/server.ts  supabase/client.ts
  types.ts
proxy.ts                     # Supabase session refresh (Next 16 "proxy", formerly middleware)
scripts/warm-cache.ts        # pre-fetch Apify for all seed destinations before demo
supabase/schema.sql          # tables + RLS, pasted into Supabase SQL editor
public/
  images/travela-logo.png    # UNCHANGED
  images/destinations/*.webp # destination photos
  icons/icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png
  sw.js
```

**Rendering rules**
- Destination Analysis = **Server Component** (keys stay server-side, first paint has data). `loading.tsx` shows skeleton.
- Plan screens = **Client Components** using `lib/tripDraft.ts` (sessionStorage) so inputs survive Gemini failures and refreshes.
- Secrets (`APIFY_TOKEN`, `GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`) are **server-only**; never prefix with `NEXT_PUBLIC_`.
- No global state library. No React Query. `fetch` + `useState`.

## 7. External API responsibilities

| API | Responsible for | NOT responsible for |
|---|---|---|
| **Apify** (Google Maps scraper) | Tourism establishment data around a destination: name, category, rating, reviewsCount, lat/lng, address, placeId. Feeds Density + Popularity factors and the itinerary place pool. | Tourist counts, reviews text, contacts, images |
| **Open-Meteo forecast** | Weather strip (current temp, weather code → icon/label, today's precip probability). Display only. | Pressure score (weather is excluded from the score) |
| **Open-Meteo geocoding** | Lat/lng + admin region for non-catalog searches | — |
| **Gemini** | Day-by-day itinerary JSON choosing from the supplied place pool; short trip title; 2–3 sustainability tips | Pressure scores, distances, route order, facts about crowding |
| **Browser Geolocation** | Optional route origin | Anything on app launch |
| **Google Maps deep link** | Real navigation, traffic, turn-by-turn | — |
| **Supabase** | Auth, `trips`, `destination_cache` | Storing photos |

### Apify call spec (`lib/apify.ts`)

- Endpoint: `POST https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=90`
- Input:
  ```json
  {
    "searchStringsArray": ["hotels", "resorts", "tourist attractions", "restaurants"],
    "locationQuery": "<name>, <region>, Philippines",
    "maxCrawledPlacesPerSearch": 15,
    "language": "en",
    "skipClosedPlaces": true,
    "scrapePlaceDetailPage": false,
    "scrapeContacts": false,
    "scrapeReviewsPersonalData": false,
    "maxReviews": 0,
    "maxImages": 0,
    "maxQuestions": 0
  }
  ```
- Trim each item to `{ id: placeId, name: title, category: categoryName, rating: totalScore, reviews: reviewsCount, lat: location.lat, lng: location.lng, address }`; drop items without coordinates; dedupe by `placeId`. Derive `kind: "lodging" | "attraction" | "food"` from the search string / category.
- Verify field names against one real response in Phase 2 and adjust the trimmer — do not assume.
- Abort with `AbortController` after 90 s.

### Gemini call spec (`lib/gemini.ts`)

- `POST https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` with header `x-goog-api-key`.
- `GEMINI_MODEL` env, default `gemini-2.5-flash` (check Google AI Studio for the current fast model and update the default if a newer flash model is available).
- `generationConfig: { responseMimeType: "application/json", temperature: 0.6 }` plus a `responseSchema` matching the type below.
- Prompt inputs: destination name/region, days, interests, pressure level (context only: "prefer less-crowded, local, walkable options"), and **the place pool** (max ~40 items: `id, name, kind, rating, lat, lng`; attractions + food, filtered by interests when possible).
- Rules in the prompt: pick stops **by `id` from the pool** whenever possible (so we have coordinates); 3–5 stops/day; realistic times 07:00–20:00; group nearby places the same day; prefer local eateries; never mention crowd numbers or scores.
- Output type:
  ```ts
  type Itinerary = {
    title: string;
    days: { day: number; theme: string; stops: { time: string; placeId: string | null; name: string; kind: "lodging"|"attraction"|"food"|"activity"; note: string }[] }[];
    tips: string[];
  };
  ```
- Server validates: correct day count, each stop has `time` + `name`; join `placeId` → coordinates from the pool; stops without coords are kept in the timeline but excluded from routing. On invalid JSON: retry once, then return `502` with a friendly message.

## 8. Supabase schema proposal (lean: 2 tables)

`profiles`, `destinations`, `destination_metrics`, `pressure_scores`, `trip_stops` are intentionally **not** separate tables:
- curated destinations live in code (`lib/destinations.ts`) — faster, versioned, no seeding step;
- metrics + score are one cached JSON snapshot;
- stops live inside the trip's JSON;
- display name lives in `auth.users.user_metadata`.

```sql
-- supabase/schema.sql
create table public.destination_cache (
  slug        text primary key,
  name        text not null,
  lat         double precision not null,
  lng         double precision not null,
  places      jsonb not null default '[]',   -- trimmed Apify places
  pressure    jsonb,                          -- { score, level, factors, reasons, computedAt }
  source      text not null default 'apify',  -- 'apify' | 'baseline'
  fetched_at  timestamptz not null default now()
);
alter table public.destination_cache enable row level security;
create policy "cache readable by all" on public.destination_cache for select using (true);
-- writes only via service role (server), no insert/update policy for anon.

create table public.trips (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  destination_slug text not null,
  destination_name text not null,
  days             int  not null check (days between 1 and 14),
  interests        text[] not null default '{}',
  pressure_score   int,
  pressure_level   text check (pressure_level in ('LOW','MODERATE','HIGH')),
  itinerary        jsonb not null,  -- Itinerary type
  route            jsonb,           -- { perDay: [{ order: placeId[], km, minutes, savedKm }], totals, co2SavedKg, origin }
  created_at       timestamptz not null default now()
);
alter table public.trips enable row level security;
create policy "own trips select" on public.trips for select using (auth.uid() = user_id);
create policy "own trips insert" on public.trips for insert with check (auth.uid() = user_id);
create policy "own trips delete" on public.trips for delete using (auth.uid() = user_id);
create index trips_user_created on public.trips (user_id, created_at desc);
```

Auth setting for the demo: **disable "Confirm email"** in Supabase Auth → Providers → Email so sign-up logs in immediately.

## 9. Tourism pressure scoring logic (`lib/pressure.ts`)

Deterministic, pure, unit-testable. Gemini never touches it.

```
score = round(0.40·Density + 0.30·Popularity + 0.20·Seasonality + 0.10·Environment)   // each factor 0–100
level = score ≤ 39 → LOW | 40–69 → MODERATE | 70–100 → HIGH
```

| Factor | Weight | Input | Formula |
|---|---|---|---|
| **Tourism Density** | 40% | trimmed places | `n = count(places within 3 km of destination center, kinds lodging+attraction+food)`; `lodgingShare = lodging within 3 km / max(1, n)`; `D = clamp(n / 50 · 100) · 0.8 + lodgingShare · 100 · 0.2`. (50 ≈ the practical max from 4 searches × 15.) |
| **Popularity** | 30% | reviewsCount | `R = sum of reviews of top 20 places by reviews`; `P = clamp((log10(max(R,1)) − 2) / 3 · 100)` → 100 reviews = 0, 100 000 reviews = 100 |
| **Seasonality** | 20% | `peakMonths`, `shoulderMonths` from catalog; month = trip month (default: current month) | peak → 90, shoulder → 55, otherwise → 25. Non-catalog default: PH peak = Dec–May, shoulder = Jun, Nov. |
| **Environmental Context** | 10% | catalog `sensitivity` (0–100: small island / protected area / reef = high) | `E = sensitivity`; non-catalog default 50 |

`clamp` = clamp to [0, 100]. Store `factors` with each sub-score so the UI can show a 4-bar breakdown.

**Reasons** (templated, deterministic, max 4, strongest first, only for factors ≥ 60 or ≤ 30):
- Density ≥ 60: "High concentration of hotels, resorts and attractions near the town center"
- Density ≤ 30: "Tourism businesses are spread out rather than concentrated"
- Popularity ≥ 60: "Very high review activity — a sign of heavy visitor interest"
- Popularity ≤ 30: "Lower review activity than major hotspots"
- Seasonality = 90: "{Month} falls in the peak travel season"
- Seasonality = 25: "{Month} is typically off-peak"
- Environment ≥ 70: "Sensitive environment (e.g. small island, reefs) that feels visitor pressure sooner"
Always append the disclaimer under the card: *"This is an estimate based on tourism activity signals, not a live headcount."*

**Baseline fallback:** each catalog destination has `baseline: { density, popularity }` (hand-set). If no cache and Apify fails/unconfigured, compute with baselines, `source: 'baseline'`, and show a small "Based on baseline data" note. This guarantees the demo works offline from Apify.

**Tuning:** after the warm-cache run, check that Boracay/El Nido/Coron land HIGH and Siquijor/Batanes/Camiguin land LOW–MODERATE. If not, adjust the Density divisor (50) or the Popularity log range — not the weights, and not per-destination hacks.

**Unit sanity test:** a tiny `lib/pressure.test.ts` run with `node --test` via `tsx` (no Vitest/Jest install) covering: level thresholds, clamp, baseline path determinism.

### Greener alternative (`lib/alternatives.ts`)

- Candidates: other catalog destinations with a known score (cache or baseline).
- `similarity = |tagsA ∩ tagsB| / |tagsA ∪ tagsB|` (Jaccard on `tags`: beach, island, diving, nature, mountains, culture, food, adventure, nightlife, heritage).
- Eligible if `candidate.score ≤ selected.score − 15` and `similarity ≥ 0.25`.
- Pick max `similarity · 0.6 + (selected.score − candidate.score)/100 · 0.4`.
- Show the alternative section when `selected.score ≥ 55`. Below that show a positive "Nice pick — this destination has lower estimated pressure" card instead.
- "Why this alternative?" bullets (deterministic): shared tags → "Similar {tag} experience"; score delta → "About {Δ} points lower estimated pressure"; plus the candidate's catalog `highlight` string (e.g. "Waterfalls, healing-village culture and quiet beaches").

### Optional P2: better time to visit
If time allows: recompute with seasonality = 25 for the first off-peak month; if level drops, show "Visit in {Month} → MODERATE".

## 10. API caching strategy

| Data | Where | TTL | Notes |
|---|---|---|---|
| Apify places + pressure snapshot | `destination_cache` | **7 days** | `getAnalysis`: fresh cache → use; stale/missing → Apify → upsert (service role); Apify fail → stale cache if any → baseline. Pressure is **recomputed on read** from `places` (cheap, keeps seasonality current). |
| In-flight dedupe | module-level `Map<slug, Promise>` in `lib/analysis.ts` | request lifetime | Prevents duplicate Apify runs from double taps. |
| Weather | `fetch(..., { next: { revalidate: 1800 } })` | 30 min | No DB. |
| Geocoding | `fetch(..., { next: { revalidate: 86400 } })` | 1 day | No DB. |
| Gemini itinerary | sessionStorage draft; persisted only when saved to `trips` | — | Never re-generate on refresh. |
| Pre-warm | `npm run warm` → `scripts/warm-cache.ts` loops the catalog sequentially | before demo | Required demo prep; keeps judge-facing loads < 1 s. |

Apify limits: 4 searches × 15 places, no images/reviews/contacts. With ~12 catalog destinations that is a small, predictable spend.

## 11. Screen-by-screen implementation plan

Global UI rules: 16 px side gutters, cards `rounded-3xl`, min touch target 44×44, bottom content padding `calc(96px + env(safe-area-inset-bottom))` on tab screens, primary CTAs full-width sticky at the bottom on flow screens, every async surface has a skeleton and an error/empty state.

### Design tokens (derived from the logo — do not change the logo)

| Token | Hex | Source / use |
|---|---|---|
| `--color-navy` | `#0B3556` | wordmark; headings, primary text, nav active |
| `--color-ocean` | `#1668B8` | deep water; primary buttons, links |
| `--color-sky` | `#3BB3E0` | light water; gradients, highlights |
| `--color-leaf` | `#3FA535` | leaf; sustainability accents, LOW |
| `--color-leaf-soft` | `#E6F4E1` | green tinted surfaces |
| `--color-sun` | `#F7B928` | sun; small accents, star ratings |
| `--color-sand` | `#F5F7F3` | app background (warm off-white, not pure white) |
| `--color-ink-muted` | `#5B6B7A` | secondary text |
| `--pressure-low` | `#2E9D4F` | LOW |
| `--pressure-mod` | `#E39B17` | MODERATE |
| `--pressure-high` | `#E0573A` | HIGH (warm coral, not alarm red) |

Signature gradient: `linear-gradient(135deg, var(--color-ocean), var(--color-sky) 55%, var(--color-leaf))` — used sparingly (Plan button, hero overlay tint, primary CTA). Glass only on the bottom nav and on text chips over photos (`bg-white/70 backdrop-blur-md`).

### Screen 1 — Home `/`
- Header: full logo (`next/image`, height 28, priority) left; profile avatar button right (→ `/profile`).
- Hero card (rounded-3xl, ~260 px tall): destination photo, dark bottom gradient, "Travel smarter. Explore responsibly." + one-line sub.
- Search bar overlapping the hero bottom: "Where do you want to go?" → submits to search handler.
- **Search behavior:** suggestions dropdown filters the catalog by name/region as you type (client-side, instant). Submit: catalog match → `/d/{slug}`; no match → `/d/q-{encoded query}` (analysis route geocodes it via Open-Meteo; if geocoding finds nothing, show "We couldn't find that place" with catalog suggestions).
- "Featured destinations": horizontal snap-scroll of 6 `DestinationCard`s (photo, name, region, `PressureBadge`). Badge value comes from cache/baseline (server-fetched in one query).
- Sustainability tip card (leaf-soft background), one rotating tip from a static array.

### Screen 1b — Explore `/explore`
- Search bar + filter chips: All / Low pressure / Beaches / Nature / Culture.
- Vertical list of all catalog destinations as compact cards with badge + score. Sort by score ascending when "Low pressure" chip is active. That's it.

### Screen 2 — Destination Analysis `/d/[slug]`
- Top bar (back, title, overlay on photo).
- Photo header with name, region, and `WeatherStrip` (temp, icon, label, rain %) — hidden entirely if weather fails.
- **Estimated Tourism Pressure card**: semicircle `PressureGauge` (SVG) with "82 / 100" and level pill; 4 factor bars (Tourism density / Popularity / Season / Environment) with %; `ReasonList`; disclaimer line; `source: baseline` note when applicable.
- **Greener Alternative section** (Screen 3, same page, directly below): see below.
- Sticky bottom CTA: "Plan a trip to {name}" → `/plan?d={slug}`.

### Screen 3 — Greener Alternative (section on `/d/[slug]`)
- Heading "A calmer option with a similar vibe".
- Side-by-side compare row: selected (name, score, badge) → arrow → alternative (name, score, badge).
- `AlternativeCard` with photo, "Why this alternative?" bullets, primary button **"Plan a trip here"** → `/plan?d={altSlug}`, secondary link "View analysis" → `/d/{altSlug}`.
- Low-score destinations get the positive card instead (no alternative).

### Screen 4 — Trip Preferences `/plan`
- If no `?d=`: destination picker (search + catalog chips). Otherwise a compact destination header with badge.
- "How many days are you staying?" — 4 large segmented tiles: 1 / 3 / 5 / 7 Days (default 3).
- "What are you into?" — interest chips with icons: Beaches, Nature, Food, Culture, Adventure (multi-select, min 1, default preselect from destination tags).
- Optional travel month select (defaults to current month; feeds seasonality — P2, skip if short on time).
- Sticky CTA "Generate My Trip" (disabled until ≥1 interest) → writes draft → `/plan/itinerary`.

### Screen 5 — AI Itinerary `/plan/itinerary`
- On mount: if draft has itinerary → render; else POST `/api/itinerary` with `{ slug, days, interests }` (server loads places from cache itself — client never sends the pool).
- Loading: animated skeleton timeline + rotating copy ("Finding local spots…", "Grouping nearby places…"). Target < 15 s.
- Render: title, day tabs (Day 1 · Day 2 …), `ItineraryTimeline` (time, kind icon, name, note, rating if known), tips card.
- Actions: "Regenerate" (secondary), sticky "Optimize my route" → `/plan/route`.
- Error: friendly card + "Try again" button; draft inputs preserved; "Edit preferences" link.

### Screen 6 — Green Route + Trip Summary `/plan/route`
- Origin selector: "Start from first stop" (default) | **"Use my location"** (triggers geolocation here, not earlier). Denied/timeout → toast "Location unavailable — starting from your first stop" and continue.
- Per day: optimize stops with coordinates (`lib/route.ts`: nearest-neighbor from origin, then 2-opt, haversine × 1.3 road factor).
- `RouteMap` (SVG): projected points, numbered markers, polyline in ocean→leaf gradient, day switcher.
- Ordered stop list ("Hotel → Attraction A → …").
- Metric tiles: **Total distance**, **Est. travel time** (avg 25 km/h), **Distance saved** (Gemini order vs optimized), **Est. CO₂ saved** (`savedKm × 0.17 kg`, labelled "estimate, based on an average car").
- Trip summary block: destination, days, interests, pressure badge.
- Buttons: **"Open in Google Maps"** (per selected day), **"Save Trip"** (primary). Not logged in → `/login?next=/plan/route`; draft survives in sessionStorage; after login auto-return and save.

Google Maps URL: `https://www.google.com/maps/dir/?api=1&origin={lat,lng}&destination={lat,lng}&waypoints={lat,lng|lat,lng}&travelmode=driving` — max 8 waypoints (truncate + note).

### Screen 7 — Trips `/trips` and `/trips/[id]`
- Logged out: empty state with "Log in to see saved trips".
- List: cards with destination photo, name, "3 days", pressure badge, interest chips, created date.
- Detail: read-only itinerary timeline + route summary + "Open in Google Maps" + Delete (with inline confirm, not `window.confirm`).

### Profile `/profile`
- Logged out: sign-in CTA. Logged in: avatar initial, display name/email, trip count, "Install Travela" button (shown when `beforeinstallprompt` was captured; on iOS show "Share → Add to Home Screen" hint), Log out. Nothing else.

### Login `/login`
- One form, toggle Sign in / Create account, email + password (+ name on sign-up). Honors `?next=`.

## 12. PWA requirements

- `app/manifest.ts`: `name: "Travela"`, `short_name: "Travela"`, `description`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait"`, `background_color: "#F5F7F3"`, `theme_color: "#0B3556"`, icons 192, 512, 512 maskable.
- Icons: `scripts/make-icons.mjs` using `sharp` crops the circular emblem from `travela-logo.png` (left square region — find the bounds by inspecting the image, roughly x 0–500), pads onto a `#F5F7F3` square (maskable: emblem at ~70% for the safe zone), exports 192/512/maskable-512/apple-touch-180 into `public/icons/`, and a replacement `app/icon.png` for the favicon. Logo file itself is untouched.
- `app/layout.tsx`: `export const viewport = { themeColor: "#0B3556", width: "device-width", initialScale: 1, viewportFit: "cover" }`; metadata `appleWebApp: { capable: true, title: "Travela", statusBarStyle: "default" }`.
- `public/sw.js` (≈40 lines): install → precache `/`, `/offline`, logo, icons; fetch → navigation requests network-first with `/offline` fallback; `/_next/static/*` and `/images/*` cache-first; never cache `/api/*` or Supabase. Registered from a tiny client component in production only.
- `next.config.ts` headers for `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate`, `Content-Type: application/javascript; charset=utf-8` (per the Next PWA guide).
- `images.remotePatterns` only if a remote photo host is actually used.
- Safe areas: `pt-[env(safe-area-inset-top)]` on top bars, bottom nav offset `bottom: calc(12px + env(safe-area-inset-bottom))`.
- Installability check: Chrome DevTools → Application → Manifest shows no errors; Lighthouse PWA "installable".

## 13. Mobile navigation structure

`components/BottomNav.tsx` — rendered only in the `(tabs)` layout.
- Floating pill: `fixed left-4 right-4 bottom-[calc(12px+env(safe-area-inset-bottom))] h-16 rounded-full`, **frosted** (`bg-white/80 backdrop-blur-xl`, 1 px white/60 border, soft navy shadow). Frosted suits Travela's photo-heavy screens.
- Items: Home (`House`), Explore (`Compass`), **Plan** (center), Trips (`Bookmark`/`Luggage`), Profile (`User`). Labels always visible (11–12 px).
- Plan: 60 px circle, signature gradient, white `Route` icon, raised `-translate-y-4`, white ring 4 px, stronger shadow. Links to `/plan` (draft destination preserved if any).
- Active state: navy icon + label + small leaf dot; inactive: ink-muted. `aria-current="page"`.
- Flow screens use `TopBar` (back arrow + title) instead; bottom nav hidden to maximize space and keep the CTA sticky.

## 14. Error / fallback strategy

| Failure | Behavior |
|---|---|
| Apify fails / token missing / timeout | stale cache → baseline scores (catalog) → for non-catalog with nothing: show "Not enough tourism data yet for {place}" + catalog suggestions. Never a raw error. |
| Supabase unreachable (cache read) | treat as cache miss; if writes fail, log and continue. |
| Open-Meteo fails | `WeatherStrip` returns `null`. Analysis unaffected. |
| Geocoding finds nothing | "We couldn't find that place" + suggestions. |
| Gemini fails / invalid JSON / quota | one server retry; then error card with **Try again**; inputs preserved in draft. |
| Place pool empty (non-catalog, no Apify) | Gemini still generates using destination name only; route screen shows "Route optimization needs mapped stops" and still offers a Google Maps search link for the destination. |
| Geolocation denied/unavailable | default to first stop, toast explanation. |
| Not logged in on Save | redirect to login with `next`, then auto-save. |
| Offline | SW serves cached shell / `/offline` page. |
| Any route crash | `app/error.tsx` + `app/(flow)/error.tsx` friendly retry screens; `app/not-found.tsx`. |

## 15–17. Implementation phases (max 4), tasks, Definition of Done

### PHASE 1 — Foundation + Core UI

Tasks:
1. `npm uninstall next-pwa`; `npm i @supabase/supabase-js @supabase/ssr lucide-react`; `npm i -D tsx`.
2. Create `.env.example` (see §20-bis) and `.env.local` (user fills keys).
3. `app/globals.css`: Tailwind v4 `@theme` tokens from §11, sand background, font variables; remove boilerplate dark-mode block (light only for MVP).
4. `app/layout.tsx`: Nunito + DM Sans, metadata (Travela title/description, appleWebApp), `viewport` export, SW register component.
5. `scripts/make-icons.mjs` → `public/icons/*`, `app/icon.png`; delete `app/favicon.ico` and unused boilerplate SVGs in `public/`.
6. `app/manifest.ts`, `public/sw.js`, `app/offline/page.tsx`, `next.config.ts` headers.
7. `lib/destinations.ts` seed catalog — **12 PH destinations**: Boracay, El Nido, Coron, Siargao, Panglao (Bohol), Baguio (high/moderate group) and Siquijor, Batanes, Camiguin, Port Barton, Caramoan, Sagada (lower group). Each: `slug, name, region, lat, lng, tags[], sensitivity, peakMonths[], shoulderMonths[], baseline {density, popularity}, highlight, image`.
8. Destination photos: download one free-license photo per destination (Unsplash / Wikimedia Commons), resize to 1200 px wide WebP (sharp), save to `public/images/destinations/{slug}.webp`; add `public/images/hero.webp`. Record sources in `public/images/destinations/CREDITS.md`. If a photo can't be sourced quickly, `DestinationCard` falls back to a gradient + emblem.
9. Components: `Button`, `Chip`, `PressureBadge`, `DestinationCard`, `SearchBar` (with catalog suggestions), `TopBar`, `BottomNav`, `Skeleton`, `EmptyState`.
10. Route groups `(tabs)` and `(flow)` with layouts; Home, Explore, placeholder Trips/Profile, placeholder `/d/[slug]` and `/plan`.
11. Home + Explore complete using **baseline** pressure from `lib/pressure.ts` (write `lib/pressure.ts` now — it's pure and Home needs badges).
12. Supabase: create project, run `supabase/schema.sql`, disable email confirmation, `lib/supabase/{server,client}.ts`, `proxy.ts` session refresh.
13. Run Impeccable `init` (PRODUCT.md) quickly with the facts in this plan, then build; one Impeccable critique pass on Home at 390×844.

**DoD Phase 1**
- `npm run build` passes; `npm run lint` clean.
- Home and Explore look finished at 390×844 (iPhone 12-ish) and 360×800; nothing overflows horizontally.
- Floating nav works on all 5 tabs, Plan button elevated, active state correct, safe-area respected.
- Search suggestions navigate to `/d/{slug}` (placeholder OK).
- Manifest valid in DevTools; icons render; app installable on Android Chrome (via tunnel/deploy) or at least "installable" in DevTools.
- Supabase connected (a server call to `destination_cache` returns without error).

### PHASE 2 — Destination Intelligence

Tasks:
1. `lib/apify.ts` (spec §7), verify fields on one real run (El Nido), finalize trimmer.
2. `lib/weather.ts` (forecast: `current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=auto&forecast_days=1`; geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=...&count=1&country_code=PH` — drop `country_code` if no result).
3. `lib/analysis.ts`: `getAnalysis(slug)` → catalog or geocoded destination → cache/Apify/baseline → `computePressure` → alternative → weather (parallel via `Promise.allSettled`).
4. Finalize `lib/pressure.ts` factors + reasons; `lib/alternatives.ts`; `lib/pressure.test.ts`.
5. `scripts/warm-cache.ts` + `"warm": "tsx scripts/warm-cache.ts"` script; run it; tune thresholds per §9.
6. UI: `/d/[slug]` page, `loading.tsx`, `PressureGauge`, factor bars, `ReasonList`, `WeatherStrip`, `AlternativeCard`, positive low-pressure card, sticky CTA.
7. Home/Explore badges switch from baseline to cached scores (one `select slug, pressure` query; baseline fallback).

**DoD Phase 2**
- Boracay → HIGH with ≥3 reasons and Siquijor (or similar) as the alternative; El Nido/Coron HIGH or upper MODERATE; Siquijor/Batanes LOW/MODERATE.
- Second visit to any warmed destination loads in < 1 s (no Apify call — verify in server logs).
- With `APIFY_TOKEN` removed, every catalog destination still renders (baseline) with the baseline note.
- With the weather URL broken, analysis still renders without the weather strip.
- A free-text search ("Puerto Galera") produces a result or a friendly not-found — never a crash.
- Copy audit: no "tourist count"/"live" wording anywhere; disclaimer visible.

### PHASE 3 — Trip Planning

Tasks:
1. `lib/tripDraft.ts` (get/set/clear in sessionStorage, typed).
2. `/plan` preferences screen: destination header/picker, `DurationPicker`, `InterestPicker`, sticky CTA.
3. `lib/gemini.ts` + `app/api/itinerary/route.ts` (spec §7): build pool from cache (filter by interests, cap 40), prompt, JSON schema, validation, one retry, coordinate join.
4. `/plan/itinerary`: loading state, day tabs, `ItineraryTimeline`, tips, regenerate, error card with retry, "Optimize my route" CTA.
5. Login page + Supabase auth (sign in / sign up / sign out), `next` redirect.
6. Save (basic): server action `saveTrip(draft)` inserting into `trips` (route may be null at this point). Wire a temporary Save button on the itinerary screen; it moves to the route screen in Phase 4.

**DoD Phase 3**
- Boracay-alternative → Siquijor, 3 days, Beaches+Nature → valid 3-day itinerary in < 15 s, stops referencing real cached places with coordinates.
- Refreshing `/plan/itinerary` does not regenerate or lose data.
- Killing `GEMINI_API_KEY` shows the retry card; restoring it and tapping Try again works without re-entering preferences.
- Sign up → save → row visible in Supabase `trips` with correct `user_id`; another user cannot read it (RLS).

### PHASE 4 — Demo Completion

Tasks:
1. `lib/route.ts`: haversine, nearest-neighbor + 2-opt per day, metrics, CO₂ estimate, Google Maps URL builder; small tests alongside the pressure test.
2. `/plan/route`: origin selector with on-demand geolocation, `RouteMap` SVG, ordered list, `MetricTile`s, summary block, "Open in Google Maps", **Save Trip** (moved here; saves `route` too), login round-trip auto-save.
3. `/trips` list + `/trips/[id]` detail + delete with inline confirm.
4. `/profile`: user info, trip count, install button (`beforeinstallprompt`) / iOS hint, logout.
5. Error boundaries: `app/error.tsx`, `app/(flow)/error.tsx`, `app/not-found.tsx`; audit every async surface for loading + error states.
6. PWA verification: install on a real Android phone (deploy to Vercel or tunnel), offline shell check.
7. Polish pass: Impeccable `audit` + `polish` on Home, Analysis, Itinerary, Route (bounded: one pass, fix, one confirm). PixelCrew QA/performance agents for a quick sweep (bundle size, image sizes, a11y labels).
8. Capacitor prep (notes §20 only — do not install unless everything above is done).
9. Deploy to Vercel with env vars; run the demo checklist on a phone.

**DoD Phase 4**
- Full §19 checklist passes on a physical phone over the deployed URL.
- Route screen shows distance saved > 0 for at least the demo itinerary (or honestly shows 0 when the order was already optimal).
- Geolocation denied path works.
- Lighthouse mobile: Performance ≥ 80, Accessibility ≥ 90, installable.
- `npm run build` + `npm run lint` clean; no console errors on the demo path.

## 18. Hackathon priority system

**P0 — must work:** mobile UI · destination search · Destination Analysis · Estimated Tourism Pressure · Greener Alternative · trip duration · interest selection · Gemini itinerary · Supabase storage where required (cache).
**P1 — strong demo:** route optimization · current location · save trip · PWA install.
**P2 — only if time remains:** Google Routes API (real distance/time/waypoint order) · CO₂ refinements · notification reminders · sophisticated seasonality / "better time to visit" · offline itinerary caching · advanced profile settings · travel-month selector.

When behind schedule, cut in this order: P2 entirely → Explore filters → Trips detail page (list only) → Profile install button → weather strip. Never cut P0.

## 19. Final demo checklist

- [ ] `npm run warm` run within the last 7 days; all 12 destinations cached (`source = 'apify'`).
- [ ] Deployed URL opens on a phone; installed to home screen; launches standalone with Travela icon and navy status bar.
- [ ] Home loads with hero, search, featured cards with pressure badges.
- [ ] Search "Boracay" → HIGH, reasons, disclaimer, weather strip.
- [ ] Greener Alternative shows a lower-pressure match with "Why this alternative?".
- [ ] "Plan a trip here" → 3 days, Beaches + Nature → Generate.
- [ ] Itinerary appears < 15 s; day tabs work.
- [ ] Optimize → route map, distance/time/saved metrics, CO₂ labelled "estimate".
- [ ] "Use my location" prompt appears only now; deny path works.
- [ ] "Open in Google Maps" opens the Maps app with the stops.
- [ ] Save → login → auto-saved → appears in Trips → detail opens.
- [ ] Airplane mode: app shell/offline page shows, no white screen.
- [ ] No text says "tourist count", "live crowd", or similar.
- [ ] Backup: screen recording of the full flow in case venue Wi-Fi fails.

## 20. APK / Capacitor preparation notes

- Strategy: **Capacitor remote-URL wrapper** — the app needs server routes (Gemini, Apify, Supabase SSR), so do **not** attempt `output: 'export'`. The Android app loads the deployed Vercel URL.
- Keep it wrap-friendly now: no reliance on `window.open` popups (use `<a href>` for Maps links), all links relative, safe-area CSS already in place, no desktop-only interactions, geolocation behind a user tap.
- Later steps (after Phase 4, not before):
  1. `npm i @capacitor/core @capacitor/android && npm i -D @capacitor/cli`
  2. `npx cap init Travela com.travela.app --web-dir public` (web-dir is a placeholder; the app uses `server.url`)
  3. `capacitor.config.ts`: `server: { url: "https://<deployed-url>", cleartext: false }`, `android: { allowMixedContent: false }`
  4. `npx cap add android` → copy launcher icons from `public/icons` (Android Studio Image Asset from `icon-maskable-512.png`)
  5. Add `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` to `AndroidManifest.xml`; optionally `@capacitor/geolocation` if WebView geolocation is flaky.
  6. Google Maps deep links: allow `https://www.google.com/maps` to open externally (`@capacitor/browser` or intent handling) so the Maps app launches.
  7. `npx cap open android` → Build → APK.
- Alternative if Capacitor is too slow on the day: **Trusted Web Activity via Bubblewrap/PWABuilder** from the manifest — requires a valid PWA, which Phase 1/4 already guarantee.

## 20-bis. Environment variables (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=              # server only (sb_secret_… or legacy service_role): writes to destination_cache
APIFY_TOKEN=                      # server only
GEMINI_API_KEY=                   # server only
GEMINI_MODEL=gemini-2.5-flash
```
Open-Meteo and Google Maps deep links need no keys. `GOOGLE_MAPS_API_KEY` only if the P2 Routes API is attempted.

## Implementation log

### Phase 1 — done (deviations from the plan above)
- Supabase public key env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new Supabase key format); server secret will be `SUPABASE_SECRET_KEY`.
- `/plan` lives in the `(tabs)` group (bottom nav visible) because it is the center-tab entry; later flow screens (`/plan/itinerary`, `/plan/route`, `/login`) go in `(flow)`.
- Pressure values are **MOCK** (`mockPressure` in `lib/destinations.ts`); `lib/pressure.ts` is deferred to Phase 2 per the Phase 1 brief. `pressureLevel()` (thresholds only) lives in `lib/destinations.ts`.
- `proxy.ts` session refresh deferred to Phase 3 (with auth). No DB schema created yet.
- `/d/[slug]` is a destination preview placeholder; Phase 2 replaces it with the full analysis.
- `/about` page added (score explanation + photo credits), linked from Profile.
- `next/image` in Next 16: use `preload` (not `priority`); `images.qualities: [75]` set.

### Phase 2 — done (deviations from the plan above)
- **Dynamic destinations:** any place is searchable. Search suggestions = catalog (instant) + Open-Meteo geocoder via `/api/places` (free). Non-catalog pages use a canonical slug `<name>-<geonamesId>` (e.g. `/d/puerto-galera-1692688`); free text `/d/<anything>` geocodes (PH results first) and redirects to it. A place within 5 km of a catalog destination redirects to the catalog page.
- **Apify input:** 3 searches (`hotels`, `tourist attractions`, `restaurants`) × 12 places (≈ $0.14/destination on the free tier). `skipClosedPlaces` dropped — Apify bills it as a per-place filter; closed places are filtered in `trimPlaces`. Token env var is `APIFY_API_TOKEN` (`APIFY_TOKEN` also accepted), sent as a Bearer header. Field names verified on live runs (Boracay, Siquijor).
- **Spend guards:** fresh cache (7 days) first; in-flight dedupe; 10-min cooldown after a failed run; `APIFY_DAILY_RUN_LIMIT` (default 15) counted from `destination_cache.fetched_at`; non-catalog places with < 5 mapped places are stored anyway so they aren't re-scraped.
- **Tuning (live data, Sept = off-peak):** `DENSITY_FULL_COUNT = 36` (matches 3 × 12), Popularity log range **[2.5, 4.5]** (316 → 0, 31.6k → 100). Result: Boracay 75 HIGH (93 in Dec), Siquijor 30 LOW (43 in Dec). Weights unchanged.
- **Snapshot caching:** `destination_cache.pressure` stores `{ version, density, popularity, nearby }`; seasonality is recomputed on every read. Bump `SCORING_VERSION` when the formulas change.
- **Schema:** `destination_cache` gained `region`, `country_code`, `place_count` (see `supabase/schema.sql`).
- **Greener alternative:** similarity uses the catalog `interests` (Beaches/Nature/Food/Culture/Adventure) rather than a separate tag list. Only offered for PH destinations. Boracay → Caramoan (Siquijor shares only "Beaches" with Boracay, Jaccard 0.2 < 0.25).
- **Tests:** `npm test` (node:test via tsx). **Warm cache:** `npm run warm` is a dry run showing the estimated cost; `npm run warm -- --yes [--only=a,b]` fetches.

### Phase 3 — done (deviations from the plan above)
- **Gemini model:** `gemini-2.5-flash` is closed to new API keys. Default is `gemini-3.5-flash` with automatic fallback to `gemini-3.8-flash` → `gemini-flash-latest` on 503/429/404/timeout (observed live: 3.5 busy → 3.8 answered in ~5 s). `thinkingLevel: "low"`, no temperature override (Gemini 3 guidance). Total budget 75 s, one retry on invalid output.
- **Grounding:** Gemini picks stops by pool ref (`p1…p40`); names, coordinates, category, rating, review count and Maps link are joined from Apify data after validation. Unknown refs become generic activities (no rating, Maps search link). No repeats across days; times normalized; non-Latin-script words stripped (observed a Cyrillic word leak once). Empty pool → "general plan" with no business names, labelled in the UI.
- **Pool:** attractions ranked by interest match then review activity (≤ 28) + well-reviewed eateries (8, or 12 with Food). Lodging excluded.
- **Save:** `saveTrip` server action (`lib/actions.ts`) on the itinerary screen (moves to the route screen in Phase 4). Pressure score is looked up server-side. Not signed in → `/login?next=/plan/itinerary?save=1` → auto-save on return.
- **Proxy:** `proxy.ts` refreshes the Supabase session (`getClaims`) on page requests; API routes excluded.
- **Plan screen:** accepts catalog and dynamic slugs via `getDestinationSummary` (never calls Apify). Form renders after hydration (sessionStorage restore) to avoid mismatches.
- **UI refinement:** header profile icon removed (Profile is in the bottom nav); hero/banner heights 300 → 276 px.
- **Rate limit:** `/api/itinerary` 8 requests / 10 min per IP (process-local).

### Phase 4 — done (deviations from the plan above)
- **Route (`lib/route.ts`):** per day, nearest-neighbour + 2-opt on an open path; the first planned stop stays fixed unless "My location" is chosen (then all stops may move). Never returns a longer route than Gemini's order (saved km is 0 when already optimal). Unmapped stops are listed but not routed. Haversine × 1.3, 25 km/h, 0.17 kg CO₂/km (labelled estimates). Maps links: `dir/?api=1`, max 8 waypoints, travelmode driving.
- **Geolocation:** only on tapping "My location"; denied/timeout, or > 50 km from the day's stops → falls back to the first stop with an explanation. The user's coordinates are never saved.
- **Save:** available on both the itinerary screen (secondary "Save", stores the default first-stop route) and the route screen (primary, stores the chosen origin mode). Shared `useSaveTrip` hook; login round-trip auto-saves via `?save=1`. `route` JSON = `{ origin, perDay: [{ day, order: placeId[], km, minutes, savedKm, co2SavedKg }], totals }` — validated server-side against the itinerary's place ids.
- **Trips:** `/trips` list (server, RLS) and `/trips/[id]` detail in the `(flow)` group (back bar, no bottom nav) with day tabs, stored route order, Maps link per day and inline-confirm delete (`deleteTrip` server action).
- **Profile:** trip count, sign out, install row (captures `beforeinstallprompt` globally; iOS "Add to Home Screen" hint; "installed" state).
- **Error boundaries:** `app/error.tsx`, `app/(flow)/error.tsx` (Next 16 passes `retry`, not `reset`).
- **Schema:** no changes — `trips.route` (jsonb) already existed from Phase 3.
- **Not done here (deployment work, awaiting approval):** real-phone PWA install check, Vercel deploy, Lighthouse, Capacitor.

### Auth gate + final verification pass
- **Sign-in only:** `proxy.ts` sends every page without a session to `/login` (card: logo → banner → email/password, forgot password, Sign in, Create account); signed-in users on `/login` go Home. `/api/itinerary` also requires a session. Password reset = `/auth/callback` (code exchange) → `/reset-password`.
- **Icons:** regenerated from `public/images/travela.png` by `scripts/make-icons.mjs` (maskable/apple sizes computed from the artwork's farthest pixel so the plane tip stays in the safe zone). Layout metadata now lists `/icon.png` explicitly — declaring `icons` had suppressed Next's automatic favicon tag.
- **Service worker (`travela-v2`):** no longer caches page HTML (all pages are private); navigations fall back to `/offline`.
- **Gemini resilience:** added `gemini-3.5-flash-lite` as the last fallback and a second pass after a 3 s pause — during verification all three main models returned 503 simultaneously several times; the lite model answered in ~3 s each time.
- **Fixes:** unhandled promise rejection on itinerary failure; pressure badges wrapping at 360–375 px (compact badge in the comparison row).
