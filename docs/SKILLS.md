# Travela — Using the Installed Development Skills

Two skill systems are installed in this repo: **PixelCrew** (`.pixel-agents/`) and **Impeccable** (`.claude/skills/impeccable`, `.agents/skills/impeccable`, `.claude/agents/impeccable-*.md`). They are tools to ship faster and cleaner — not goals in themselves. `docs/PLAN.md` is the source of truth for scope; if a skill suggests something outside the plan, the plan wins.

---

## PixelCrew (`.pixel-agents/`)

**What's there:** an orchestrator plus role agents (`frontend`, `backend`, `database`, `security`, `performance`, `qa`) in `.pixel-agents/agents/*.md`, skill notes in `.pixel-agents/skills/*.md`, config in `config.json`, a status dashboard (`.pixel-agents/dashboard`, port 4747) and an event log (`events.jsonl`).

**Use it for:**
- **Codebase-aware implementation** — read `.pixel-agents/context.json` and the relevant role agent file before a large task to stay consistent with the detected stack (Next.js App Router, React, Tailwind, TypeScript).
- **Component work** — the `frontend` agent's scope (`app/**`, `components/**`, `public/**`) matches Travela's layout; the `react.md`, `nextjs.md`, `anti-ai-patterns.md` and `design-director.md` notes are useful checklists.
- **Development coordination** — when a phase has independent chunks (e.g. Phase 2: `lib/apify.ts` + `lib/weather.ts` vs. the Analysis UI), the orchestrator's dependency order applies: data/schema → server logic → UI binding → QA.
- **Phase-end sweeps** — `performance` (image sizes, bundle, LCP) and `qa`/`security` (secrets never `NEXT_PUBLIC_`, RLS on `trips`) agents in Phase 4.

**Travela-specific corrections to PixelCrew's auto-detected profile:**
- Database is **Supabase (Postgres) via `supabase/schema.sql`** — ignore the `prisma.md` / `drizzle.md` notes; no ORM.
- Backend lives in `app/api/**`, server actions and `lib/**` — not `server/`, `routes/`, `controllers/`.
- Testing is a couple of `node --test` files for pure logic (`lib/pressure.ts`, `lib/route.ts`). Do not install Vitest/Playwright for the MVP.
- Keep parallelism modest: at most 2 concurrent implementation agents; one agent owns a file at a time.

## Impeccable (`.claude/skills/impeccable`)

**What's there:** the `impeccable` skill (v4.3.1) with commands (`init`, `shape`, `critique`, `audit`, `polish`, `layout`, `typeset`, `adapt`, `harden`, `clarify`, …), reference playbooks, subagents (`impeccable-finish-reviewer`, `impeccable-documenter`, `impeccable-asset-producer`, `impeccable-manual-edit-applier`), and **hooks** that run a design detector after every Edit/Write and a deeper pass on Stop (see `.claude/settings.local.json`). Hook findings are feedback — fix real issues, don't chase noise.

**Use it for:**
- **UX review** — `critique` on a finished screen (Home, Analysis, Itinerary, Route).
- **Mobile visual hierarchy** — `layout` when a screen feels flat or crowded; one clear primary action per screen.
- **Spacing** — 16 px gutters, consistent card padding, 8-pt rhythm.
- **Typography** — `typeset`: Nunito display / DM Sans body per PLAN §5; readable 15–16 px body on mobile.
- **Interaction states** — pressed, disabled, loading, focus-visible for buttons, chips, nav items.
- **Accessibility** — `audit`: contrast (especially white text on photos and pressure colors), 44×44 touch targets, labels on icon buttons, `aria-current` in the nav.
- **UI consistency** — `polish` in Phase 4 across the demo path.
- **Resilience** — `harden` for empty/error/loading states listed in PLAN §14.

**Travela-specific setup:**
- Mode for the whole app is **Operate** (task-completion app UI), with the Home hero allowed a little Persuade energy.
- Run `init` once in Phase 1 to write `PRODUCT.md` from PLAN.md facts (Travela, mobile-first PWA, sustainability, "Estimated Tourism Pressure" wording rule). Don't let it expand scope.
- Design authority = the existing logo + PLAN §11 tokens. Impeccable's "redesign/new world" flows are **not** used; treat all work as **refinement within the Travela identity**.
- Keep verification bounded, as the skill itself instructs: build → one batched check at 390×844 and 360×800 → fix → at most one confirm round → stop.
- `impeccable-documenter` may generate `DESIGN.md` at the end of Phase 4 if time allows (P2).

## When to use which

| Situation | Use |
|---|---|
| Starting a phase / big multi-file task | PixelCrew context + role agent notes |
| Building a new screen | Just build it per PLAN §11; Impeccable hook feedback while editing |
| Screen done, looks "off" | Impeccable `critique` → `layout` / `typeset` |
| Before demo | Impeccable `audit` + `polish` on the demo path; PixelCrew `performance` + `qa` sweep |
| Backend-only work (Apify, Gemini, Supabase) | Neither is needed; follow PLAN §7–§10 |

## DO

- **Inspect the existing implementation first** — read the files you're touching and `node_modules/next/dist/docs/` for Next 16 APIs (e.g. `proxy.ts`, async `cookies()`/`params`).
- **Preserve existing working functionality** — don't rewrite a working component to satisfy a style preference.
- **Use skills only where useful** — a one-line fix doesn't need a critique pass.
- **Prioritize speed** — P0 before P1 before P2 (PLAN §18).
- **Make mobile UX consistent** — same card radius, chip style, CTA placement, nav behavior and pressure colors everywhere.
- Keep the "Estimated Tourism Pressure" wording and the non-shaming tone in every copy suggestion.

## DO NOT

- **Redesign approved branding** — the palette in PLAN §11 is derived from the logo; keep it.
- **Replace or alter the Travela logo** (`public/images/travela-logo.png`). Icons are crops of it, nothing more.
- **Introduce unnecessary architecture** — no state libraries, ORMs, design-system packages, monorepo tooling, or map SDKs.
- **Create unrelated features** — anything not in PLAN §4 is out.
- **Spend excessive time polishing one screen** while core functionality (P0) is incomplete.
- Let a skill's generic advice override a decision already made in PLAN.md.
