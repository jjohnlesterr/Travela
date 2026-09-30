-- Travela schema. Applied to the Supabase project via migrations (MCP apply_migration).
-- Phase 2: destination cache. Phase 3 adds `trips`.

-- Trimmed Apify Google Maps places + pressure factor snapshot per destination.
-- slug = catalog slug ("boracay") or canonical dynamic slug "<name>-<geonamesId>" ("puerto-galera-1692688").
create table public.destination_cache (
  slug          text primary key,
  name          text not null,
  region        text,
  country_code  text,
  lat           double precision not null,
  lng           double precision not null,
  places        jsonb not null default '[]'::jsonb,   -- Place[] (lib/places.ts)
  place_count   int  not null default 0,
  pressure      jsonb,                               -- PressureSnapshot { version, density, popularity, nearby, computedAt }
  source        text not null default 'apify' check (source in ('apify')),
  fetched_at    timestamptz not null default now()   -- TTL 7 days (lib/cache.ts); also drives the daily Apify cap
);
create index destination_cache_fetched_at on public.destination_cache (fetched_at desc);

alter table public.destination_cache enable row level security;
create policy "cache readable by all" on public.destination_cache for select to anon, authenticated using (true);
-- No insert/update/delete policies: writes only through the secret key on the server.

-- Phase 3: saved trips. Owner-only via RLS; user_id defaults to the caller.
create table public.trips (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  destination_slug text not null,
  destination_name text not null,
  days             int  not null check (days between 1 and 14),
  interests        text[] not null default '{}',
  pressure_score   int check (pressure_score between 0 and 100),
  pressure_level   text check (pressure_level in ('LOW','MODERATE','HIGH')),
  itinerary        jsonb not null,  -- Itinerary (lib/itinerary.ts)
  route            jsonb,           -- Phase 4
  created_at       timestamptz not null default now()
);
create index trips_user_created on public.trips (user_id, created_at desc);
alter table public.trips enable row level security;
create policy "own trips select" on public.trips for select to authenticated using ((select auth.uid()) = user_id);
create policy "own trips insert" on public.trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own trips delete" on public.trips for delete to authenticated using ((select auth.uid()) = user_id);
