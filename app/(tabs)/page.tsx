import Image from "next/image";
import { Leaf } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import DestinationCard from "@/components/DestinationCard";
import SearchBar from "@/components/SearchBar";
import SectionHeader from "@/components/SectionHeader";
import { getDestination, type Destination } from "@/lib/destinations";
import { getCatalogScores } from "@/lib/scores";

// Badges read cached scores from Supabase; refresh at most every 10 minutes.
export const revalidate = 600;

const FEATURED = ["boracay", "siquijor", "el-nido", "siargao", "camiguin", "coron"]
  .map(getDestination)
  .filter((d): d is Destination => Boolean(d));

const TIPS = [
  "Travel during off-peak months to ease pressure on popular destinations — and enjoy quieter beaches.",
  "Choose locally owned guesthouses and eateries so more of your spend stays in the community.",
  "Group nearby stops on the same day. Fewer long transfers means less fuel and more time exploring.",
];

export default async function HomePage() {
  const scores = await getCatalogScores();
  const tip = TIPS[new Date().getDate() % TIPS.length];

  return (
    <>
      <AppHeader />

      <section className="px-4">
        <div className="relative h-[276px] overflow-hidden rounded-[32px] bg-navy shadow-card">
          <Image
            src="/images/destinations/hero.webp"
            alt="Limestone islands in Bacuit Bay, El Nido"
            fill
            preload
            sizes="(max-width: 480px) 100vw, 480px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/5 via-navy/25 to-navy/90" />
          <div className="animate-rise-in absolute inset-x-0 bottom-0 px-5 pb-12 text-white">
            <h1 className="font-display text-[32px] leading-[1.05] font-black text-balance">
              Travel smarter.
              <br />
              <span className="text-sun">Explore responsibly.</span>
            </h1>
            <p className="mt-2 max-w-[30ch] text-[15px] leading-snug text-white/90">
              See estimated tourism pressure before you go, and find calmer places with the same magic.
            </p>
          </div>
        </div>

        <div className="relative z-20 -mt-7 min-[360px]:px-2">
          <SearchBar placeholder="Where do you want to go?" />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader title="Featured destinations" href="/explore" />
        <ul className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2">
          {FEATURED.map((d) => (
            <li key={d.slug} className="w-[62%] max-w-[260px] shrink-0 snap-start">
              <DestinationCard destination={d} score={scores[d.slug].score} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 px-4">
        <div className="flex gap-3.5 rounded-3xl bg-leaf-soft p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-leaf text-white">
            <Leaf className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-base font-extrabold text-leaf-deep">Travel tip</h2>
            <p className="mt-0.5 text-[14px] leading-snug text-navy/85">{tip}</p>
          </div>
        </div>
      </section>
    </>
  );
}
