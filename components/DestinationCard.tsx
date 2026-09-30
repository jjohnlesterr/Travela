import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Destination } from "@/lib/destinations";
import PressureBadge from "./PressureBadge";

type Props = {
  destination: Destination;
  /** "feature" = tall photo card for carousels, "row" = compact list item. */
  variant?: "feature" | "row";
  href?: string;
  /** Estimated Tourism Pressure (cached Apify snapshot or baseline) — see lib/scores.ts. */
  score: number;
};

export default function DestinationCard({ destination: d, variant = "feature", href, score }: Props) {
  const to = href ?? `/d/${d.slug}`;

  if (variant === "row") {
    return (
      <Link
        href={to}
        className="flex items-center gap-3.5 rounded-3xl bg-surface p-2.5 pr-4 shadow-card transition-transform active:scale-[0.98]"
      >
        <div className="relative size-[88px] shrink-0 overflow-hidden rounded-2xl bg-navy-soft">
          <Image src={d.image} alt="" fill sizes="88px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h3 className="truncate font-display text-lg font-extrabold text-navy">{d.name}</h3>
          <p className="mb-2 flex items-center gap-1 text-[13px] text-ink-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{d.region}, Philippines</span>
          </p>
          <PressureBadge score={score} showScore />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={to}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-navy-soft shadow-card transition-transform active:scale-[0.98]"
    >
      <Image
        src={d.image}
        alt=""
        fill
        sizes="(max-width: 480px) 62vw, 300px"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent" />
      <div className="absolute top-3 left-3">
        <PressureBadge score={score} variant="overlay" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h3 className="font-display text-xl leading-tight font-extrabold">{d.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-white/85">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{d.region}</span>
        </p>
      </div>
    </Link>
  );
}
