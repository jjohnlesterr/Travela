import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";
import { Database, Gauge, Info, Leaf, MapPin, Route, SearchX, Sprout } from "lucide-react";
import AlternativeCard from "@/components/AlternativeCard";
import FactorBars from "@/components/FactorBars";
import PressureBadge from "@/components/PressureBadge";
import PressureGauge from "@/components/PressureGauge";
import ReasonList from "@/components/ReasonList";
import TopBar from "@/components/TopBar";
import WeatherStrip from "@/components/WeatherStrip";
import { getAnalysis, type Analysis, type DestinationInfo } from "@/lib/analysis";
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { monthName } from "@/lib/pressure";
import type { Weather } from "@/lib/weather";

// Data comes from Supabase / Apify / Open-Meteo at request time; never prerender (it would call Apify at build).
export const dynamic = "force-dynamic";

/** Deduped per request, so metadata and page share one analysis. */
const analyze = cache(getAnalysis);

export async function generateMetadata({ params }: PageProps<"/d/[slug]">) {
  const { slug } = await params;
  const name = getDestination(slug)?.name ?? decodeURIComponent(slug).replace(/-\d+$/, "").replace(/-/g, " ");
  return { title: `${name.replace(/\b\w/g, (c) => c.toUpperCase())} · Estimated Tourism Pressure · Travela` };
}

export default async function DestinationPage({ params }: PageProps<"/d/[slug]">) {
  const { slug } = await params;
  const result = await analyze(slug);

  if (result.status === "redirect") redirect(`/d/${result.slug}`);
  if (result.status === "not-found") return <NotFound query={result.query} lookupFailed={result.lookupFailed} />;
  if (result.status === "no-data")
    return <NoData destination={result.destination} weather={result.weather} reason={result.reason} />;
  return <AnalysisView a={result} />;
}

// ---------------------------------------------------------------------------------------------

function Header({ d, weather }: { d: DestinationInfo; weather: Weather | null }) {
  const place = [d.region, d.catalog || d.countryCode === "PH" ? "Philippines" : d.countryCode].filter(Boolean).join(", ");
  return (
    <div className="relative h-[276px] overflow-hidden rounded-b-[36px] bg-navy">
      <TopBar overlay />
      {d.catalog ? (
        <Image src={d.catalog.image} alt={d.name} fill preload sizes="(max-width: 480px) 100vw, 480px" className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-brand-gradient opacity-90" aria-hidden />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-white">
        <h1 className="font-display text-4xl leading-none font-black text-balance">{d.name}</h1>
        <p className="mt-2 flex items-center gap-1 text-[15px] text-white/85">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{place}</span>
        </p>
        <div className="mt-3 min-h-8">
          <WeatherStrip weather={weather} />
        </div>
      </div>
    </div>
  );
}

function relativeDays(iso: string) {
  const days = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "today";
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-days, "day");
}

function SourceNote({ a }: { a: Analysis }) {
  const n = a.placeCount;
  const text =
    a.source === "baseline"
      ? "Based on baseline data for this destination — live place data isn't available right now."
      : a.source === "stale-cache"
        ? `Based on ${n} Google Maps places last checked ${relativeDays(a.fetchedAt!)}. Fresher data isn't available right now.`
        : a.source === "live"
          ? `Based on ${n} Google Maps places, checked just now.`
          : `Based on ${n} Google Maps places, checked ${relativeDays(a.fetchedAt!)}.`;
  return (
    <p className="flex gap-2 text-[12px] leading-snug text-ink-muted">
      <Database className="mt-px size-3.5 shrink-0" aria-hidden />
      {text}
    </p>
  );
}

function AnalysisView({ a }: { a: Analysis }) {
  const d = a.destination;
  const p = a.pressure;

  return (
    <>
      <Header d={d} weather={a.weather} />

      <section className="mt-5 px-4" aria-labelledby="pressure-title">
        <div className="rounded-3xl bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 id="pressure-title" className="flex items-center gap-2 font-display text-lg font-extrabold text-navy">
              <Gauge className="size-5 text-ocean" aria-hidden />
              Estimated Tourism Pressure
            </h2>
          </div>

          <div className="mt-4">
            <PressureGauge score={p.score} level={p.level} />
          </div>
          <div className="mt-3 flex justify-center">
            <PressureBadge score={p.score} />
          </div>
          <p className="mt-2 text-center text-[13px] text-ink-muted">For {monthName(p.month)}</p>

          <h3 className="mt-6 text-sm font-bold text-navy">Why this score</h3>
          <div className="mt-2.5">
            <ReasonList reasons={p.reasons} />
          </div>

          <details className="group mt-5 rounded-2xl bg-sand px-4 py-3">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy">
              How the score is built
              <span className="text-ocean group-open:hidden">Show</span>
              <span className="hidden text-ocean group-open:inline">Hide</span>
            </summary>
            <div className="mt-3">
              <FactorBars factors={p.factors} />
            </div>
          </details>

          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="flex gap-2 text-[13px] leading-snug text-navy/80">
              <Info className="mt-px size-4 shrink-0 text-ocean" aria-hidden />
              This is an estimate based on tourism activity signals, not a live headcount.
            </p>
            <SourceNote a={a} />
          </div>
        </div>
      </section>

      <section className="mt-8 px-4" aria-labelledby="alt-title">
        {a.showAlternative && a.alternative ? (
          <>
            <h2 id="alt-title" className="font-display text-xl font-extrabold text-navy">
              A calmer option with a similar vibe
            </h2>
            <p className="mt-1 mb-3 text-[14px] text-ink-muted">
              {d.name} is well loved. If you&apos;d like more breathing room, try this.
            </p>
            <AlternativeCard alternative={a.alternative} selected={{ name: d.name, score: p.score }} />
          </>
        ) : a.showAlternative ? (
          <div className="flex gap-3.5 rounded-3xl bg-sun-soft p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sun text-navy">
              <Sprout className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id="alt-title" className="font-display text-base font-extrabold text-navy">
                Tips for a lighter visit
              </h2>
              <p className="mt-0.5 text-[14px] leading-snug text-navy/85">
                {p.season === "peak"
                  ? "Visiting outside the peak season, staying a little away from the busiest strip, and choosing local guides all help spread the load."
                  : "Stay a little away from the busiest strip, walk or cycle between nearby stops, and choose locally owned places to stay and eat."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3.5 rounded-3xl bg-leaf-soft p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-leaf text-white">
              <Leaf className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id="alt-title" className="font-display text-base font-extrabold text-leaf-deep">
                Nice pick
              </h2>
              <p className="mt-0.5 text-[14px] leading-snug text-navy/85">
                {d.name} has lower estimated tourism pressure than the busiest hotspots. Your visit helps spread
                tourism more evenly.
              </p>
            </div>
          </div>
        )}
      </section>

      <PlanCta slug={d.slug} name={d.name} />
    </>
  );
}

function PlanCta({ slug, name }: { slug: string; name: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] bg-gradient-to-t from-sand via-sand/95 to-sand/0 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <Link
        href={`/plan?d=${slug}`}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-semibold text-white shadow-float transition-transform active:scale-[0.98]"
      >
        <Route className="size-5 shrink-0" aria-hidden />
        <span className="truncate">Plan a trip to {name}</span>
      </Link>
    </div>
  );
}

function Suggestions() {
  const picks = DESTINATIONS.filter((d) => ["siquijor", "camiguin", "batanes", "port-barton"].includes(d.slug));
  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-semibold text-navy">Try one of these instead</p>
      <div className="flex flex-wrap gap-2">
        {picks.map((x) => (
          <Link
            key={x.slug}
            href={`/d/${x.slug}`}
            className="flex h-10 items-center rounded-full bg-surface px-4 text-sm font-semibold text-navy ring-1 ring-line hover:bg-leaf-soft"
          >
            {x.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function NotFound({ query, lookupFailed }: { query: string; lookupFailed: boolean }) {
  return (
    <>
      <TopBar title="Destination" />
      <section className="px-4 pt-6">
        <div className="rounded-3xl bg-surface p-6 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-navy-soft text-navy">
            <SearchX className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-xl font-extrabold text-navy">
            {lookupFailed ? "We couldn't look that up right now" : "We couldn't find that place"}
          </h1>
          <p className="mt-1.5 text-[15px] leading-snug text-ink-muted">
            {lookupFailed
              ? `Place search is temporarily unavailable. Try “${query}” again in a moment, or pick a destination below.`
              : `Nothing matched “${query}”. Check the spelling or try a nearby town or island.`}
          </p>
        </div>
        <Suggestions />
      </section>
    </>
  );
}

type NoDataProps = { destination: DestinationInfo; weather: Weather | null; reason: "few-places" | "unavailable" };

function NoData({ destination: d, weather, reason }: NoDataProps) {
  return (
    <>
      <Header d={d} weather={weather} />
      <section className="mt-5 px-4">
        <div className="rounded-3xl bg-surface p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-navy">
            <Gauge className="size-5 text-ocean" aria-hidden />
            Estimated Tourism Pressure
          </h2>
          <p className="mt-3 text-[15px] leading-snug text-navy/85">Not enough tourism data yet for {d.name}.</p>
          <p className="mt-2 text-[13px] leading-snug text-ink-muted">
            {reason === "few-places"
              ? "We found very few hotels, attractions and eateries mapped here — too few to estimate pressure reliably. Quiet places often land here."
              : "Tourism place data isn't available for this destination right now. Please check back later."}
          </p>
        </div>
        <Suggestions />
      </section>
      <PlanCta slug={d.slug} name={d.name} />
    </>
  );
}
