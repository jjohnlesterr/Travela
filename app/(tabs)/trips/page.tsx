import Image from "next/image";
import Link from "next/link";
import { Route } from "lucide-react";
import AppHeader from "@/components/AppHeader";

export const metadata = { title: "Trips · Travela" };

export default function TripsPage() {
  // Phase 4: list saved trips from Supabase (auth required).
  return (
    <>
      <AppHeader title="Trips" subtitle="Your saved plans and green routes" />
      <section className="mt-6 px-4">
        <div className="flex flex-col items-center rounded-[32px] bg-surface px-6 pt-10 pb-8 text-center shadow-card">
          <div className="relative mb-5 size-24">
            <div className="absolute inset-0 rounded-full bg-leaf-soft" />
            <Image src="/icons/icon-192.png" alt="" width={96} height={96} className="relative rounded-full mix-blend-multiply" />
          </div>
          <h2 className="font-display text-2xl font-black text-navy">Your trips will appear here</h2>
          <p className="mt-2 max-w-[30ch] text-[15px] leading-snug text-ink-muted">
            Plan a trip and save it to keep your itinerary and route in one place.
          </p>
          <Link
            href="/plan"
            className="mt-6 flex h-13 items-center gap-2 rounded-2xl bg-navy px-6 font-semibold text-white shadow-card transition-colors hover:bg-ocean active:scale-[0.98]"
          >
            <Route className="size-5" aria-hidden />
            Plan a Trip
          </Link>
        </div>
      </section>
    </>
  );
}
