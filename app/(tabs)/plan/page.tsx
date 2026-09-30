import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Route, Sparkles, X } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PressureBadge from "@/components/PressureBadge";
import SearchBar from "@/components/SearchBar";
import { getDestinationSummary } from "@/lib/analysis";
import { DESTINATIONS } from "@/lib/destinations";
import { getCatalogScores } from "@/lib/scores";
import PlanForm from "./PlanForm";

export const metadata = { title: "Plan a trip · Travela" };

const STEPS = [
  { icon: MapPin, title: "Choose a destination", body: "See its estimated tourism pressure and calmer alternatives." },
  { icon: CalendarDays, title: "Days & interests", body: "Tell us how long you're staying and what you love." },
  { icon: Sparkles, title: "AI itinerary", body: "A day-by-day plan built around nearby, local spots." },
  { icon: Route, title: "Green route", body: "Stops reordered to cut unnecessary travel." },
];

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const { d } = await searchParams;
  const selected = typeof d === "string" ? await getDestinationSummary(d) : null;
  const scores = await getCatalogScores();
  const calmer = DESTINATIONS.filter((x) => scores[x.slug].score < 40).slice(0, 4);

  return (
    <>
      <AppHeader
        title="Plan a trip"
        subtitle={selected ? "Tell us how long and what you love" : "Four quick steps to a lighter-footprint trip"}
      />

      <section className="px-4">
        {selected ? (
          <div className="overflow-hidden rounded-3xl bg-surface shadow-card">
            <div className="relative h-36">
              {selected.image ? (
                <Image src={selected.image} alt="" fill sizes="(max-width: 480px) 100vw, 480px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-brand-gradient opacity-90" aria-hidden />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
              <Link
                href="/plan"
                aria-label="Change destination"
                className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/85 text-navy backdrop-blur-md"
              >
                <X className="size-5" aria-hidden />
              </Link>
              <div className="absolute bottom-3 left-4 text-white">
                <p className="text-[13px] text-white/85">Planning a trip to</p>
                <h2 className="font-display text-2xl font-black">{selected.name}</h2>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              {selected.pressure ? (
                <PressureBadge score={selected.pressure.score} showScore />
              ) : (
                <span className="text-[13px] text-ink-muted">{[selected.region, selected.countryCode].filter(Boolean).join(", ")}</span>
              )}
              <Link href={`/d/${selected.slug}`} className="flex min-h-11 items-center text-sm font-semibold text-ocean">
                View destination
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mb-2 font-display text-lg font-extrabold text-navy">Where do you want to go?</h2>
            <SearchBar mode="plan" />
            <p className="mt-5 mb-2 text-sm font-semibold text-navy">Calmer picks to start with</p>
            <div className="flex flex-wrap gap-2">
              {calmer.map((x) => (
                <Link
                  key={x.slug}
                  href={`/plan?d=${x.slug}`}
                  className="flex h-10 items-center gap-1.5 rounded-full bg-surface pr-4 pl-3 text-sm font-semibold text-navy ring-1 ring-line transition-colors hover:bg-leaf-soft"
                >
                  <span className="size-2 rounded-full bg-pressure-low" aria-hidden />
                  {x.name}
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {selected ? (
        <section className="px-4">
          <PlanForm
            destination={{
              slug: selected.slug,
              name: selected.name,
              region: selected.region,
              score: selected.pressure?.score ?? null,
              level: selected.pressure?.level ?? null,
            }}
            suggestedInterests={selected.interests}
          />
        </section>
      ) : (
        <section className="mt-8 px-4">
          <h2 className="mb-3 font-display text-lg font-extrabold text-navy">How it works</h2>
          <ol className="relative flex flex-col gap-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="flex gap-3.5">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                      i === 0 ? "bg-navy text-white" : "bg-navy-soft text-navy"
                    }`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="pt-0.5">
                    <h3 className="font-semibold text-navy">{s.title}</h3>
                    <p className="text-[14px] leading-snug text-ink-muted">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );
}
