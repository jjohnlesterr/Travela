import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronRight, LogIn, Route } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PressureBadge from "@/components/PressureBadge";
import { getDestination } from "@/lib/destinations";
import { formatDate, listTrips, type TripSummary } from "@/lib/trips";

export const metadata = { title: "Trips · Travela" };

export default async function TripsPage() {
  const trips = await listTrips();

  return (
    <>
      <AppHeader title="Trips" subtitle="Your saved plans and green routes" />
      {trips === null ? (
        <Empty
          title="Log in to see saved trips"
          body="Sign in to keep your itineraries and green routes in one place, on any device."
          href="/login?next=/trips"
          cta="Sign in"
          icon={LogIn}
        />
      ) : trips.length === 0 ? (
        <Empty
          title="Your trips will appear here"
          body="Plan a trip and save it to keep your itinerary and route in one place."
          href="/plan"
          cta="Plan a Trip"
          icon={Route}
        />
      ) : (
        <ul className="mt-2 flex flex-col gap-3 px-4">
          {trips.map((t) => (
            <li key={t.id}>
              <TripCard trip={t} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TripCard({ trip: t }: { trip: TripSummary }) {
  const image = getDestination(t.destination_slug)?.image;
  return (
    <Link
      href={`/trips/${t.id}`}
      className="flex items-center gap-3.5 rounded-3xl bg-surface p-2.5 pr-3 shadow-card transition-transform active:scale-[0.98]"
    >
      <div className="relative size-[88px] shrink-0 overflow-hidden rounded-2xl bg-navy-soft">
        {image ? (
          <Image src={image} alt="" fill sizes="88px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-brand-gradient opacity-90" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1 py-1">
        <h2 className="truncate font-display text-lg font-extrabold text-navy">{t.destination_name}</h2>
        {t.title && <p className="truncate text-[13px] text-navy/80">{t.title}</p>}
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-muted">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          {t.days} {t.days === 1 ? "day" : "days"} · Saved {formatDate(t.created_at)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {t.pressure_score !== null && <PressureBadge score={t.pressure_score} />}
          {t.interests.slice(0, 2).map((i) => (
            <span key={i} className="rounded-full bg-navy-soft px-2 py-0.5 text-[11px] font-semibold text-navy">
              {i}
            </span>
          ))}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden />
    </Link>
  );
}

function Empty({ title, body, href, cta, icon: Icon }: { title: string; body: string; href: string; cta: string; icon: typeof Route }) {
  return (
    <section className="mt-6 px-4">
      <div className="flex flex-col items-center rounded-[32px] bg-surface px-6 pt-10 pb-8 text-center shadow-card">
        <div className="relative mb-5 size-24">
          <div className="absolute inset-0 rounded-full bg-leaf-soft" />
          <Image src="/icons/icon-192.png" alt="" width={96} height={96} className="relative rounded-full mix-blend-multiply" />
        </div>
        <h2 className="font-display text-2xl font-black text-navy">{title}</h2>
        <p className="mt-2 max-w-[30ch] text-[15px] leading-snug text-ink-muted">{body}</p>
        <Link
          href={href}
          className="mt-6 flex h-13 items-center gap-2 rounded-2xl bg-navy px-6 font-semibold text-white shadow-card transition-colors hover:bg-ocean active:scale-[0.98]"
        >
          <Icon className="size-5" aria-hidden />
          {cta}
        </Link>
      </div>
    </section>
  );
}
