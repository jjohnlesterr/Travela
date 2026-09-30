# Product

> Derived from the approved project brief and `docs/PLAN.md` (the source of truth for scope).

## Platform
web

## Stack
Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Supabase, Gemini API, Apify Google Maps Scraper, Open-Meteo. Mobile-first installable PWA; later wrapped as an Android APK with Capacitor.

## Users
Travelers in the Philippines choosing where to go and how to plan a short trip (1–7 days), on their phones. Hackathon judges evaluating the demo on a phone.

## Product Purpose
Help travelers understand the **estimated tourism pressure** of a destination, discover similar lower-pressure alternatives, and plan a personalized itinerary with a greener, optimized route.

## Positioning
A premium, friendly travel app with a sustainability lens — not a booking site, not an admin dashboard. It encourages responsible choices; it never shames popular destinations.

## Operating Context
Phone in hand, often outdoors or on the move, sometimes on weak connections. One-handed use; bottom navigation; large touch targets.

## Capabilities and Constraints
- Pressure scores are deterministic estimates from tourism activity signals — never real-time headcounts. Always "Estimated Tourism Pressure".
- AI (Gemini) writes itineraries and may explain scores; it never produces scores.
- Every API-dependent feature degrades gracefully.
- Time-limited hackathon: simple and working beats complex.

## Brand Commitments
- Existing logo `public/images/travela-logo.png` is fixed; do not redesign or replace it.
- Palette derived from the logo: navy `#0B3556`, ocean `#1668B8`, sky `#3BB3E0`, leaf `#3FA535`, sun `#F7B928`, warm off-white `#F5F7F3`.
- Rounded display type (Nunito) echoing the wordmark; DM Sans for UI text.
- Destination photography, soft rounded cards, subtle gradients; frosted glass only on the floating nav and photo overlays.

## Evidence on Hand
Logo, 12 curated destination photos (Wikimedia Commons, see `public/images/destinations/CREDITS.md`), `docs/PLAN.md`.

## Product Principles
1. The core journey (search → pressure → alternative → plan → itinerary → route → save) is always obvious.
2. Honest estimates, clearly labelled.
3. Encourage, don't prohibit.
4. Mobile first; desktop only needs to work.

## Accessibility & Inclusion
WCAG AA contrast, 44×44 px minimum touch targets, labelled icon buttons, visible focus, `prefers-reduced-motion` respected, 16 px inputs (no iOS zoom).
