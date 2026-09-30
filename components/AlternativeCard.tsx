import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Route } from "lucide-react";
import type { Alternative } from "@/lib/alternatives";
import PressureBadge from "./PressureBadge";

type Props = {
  alternative: Alternative;
  selected: { name: string; score: number };
};

export default function AlternativeCard({ alternative: alt, selected }: Props) {
  const d = alt.destination;
  return (
    <div className="overflow-hidden rounded-3xl bg-surface shadow-card">
      {/* Compare row: selected → alternative */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line px-4 py-3.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink-muted">{selected.name}</p>
          <PressureBadge score={selected.score} showScore compact />
        </div>
        <ArrowRight className="size-5 text-leaf" aria-label="compared with" />
        <div className="min-w-0 text-right">
          <p className="truncate text-[13px] font-semibold text-ink-muted">{d.name}</p>
          <PressureBadge score={alt.score} showScore compact />
        </div>
      </div>

      <div className="relative h-44">
        <Image src={d.image} alt={d.name} fill sizes="(max-width: 480px) 100vw, 480px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-3 text-white">
          <h3 className="font-display text-2xl leading-tight font-black">{d.name}</h3>
          <p className="text-[13px] text-white/85">{d.region}, Philippines</p>
        </div>
      </div>

      <div className="p-4">
        <h4 className="text-sm font-bold text-navy">Why this alternative?</h4>
        <ul className="mt-2 flex flex-col gap-2">
          {alt.reasons.map((r) => (
            <li key={r} className="flex gap-2 text-[14px] leading-snug text-navy/90">
              <Check className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
              <span>{r}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-1">
          <Link
            href={`/plan?d=${d.slug}`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-leaf-deep font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <Route className="size-5" aria-hidden />
            Plan a trip here
          </Link>
          <Link
            href={`/d/${d.slug}`}
            className="flex h-11 items-center justify-center text-sm font-semibold text-ocean"
          >
            View {d.name} analysis
          </Link>
        </div>
      </div>
    </div>
  );
}
