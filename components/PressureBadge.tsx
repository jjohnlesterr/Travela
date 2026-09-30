import { pressureLevel } from "@/lib/destinations";

const STYLES = {
  LOW: { label: "Low", dot: "bg-pressure-low", solid: "bg-pressure-low-soft text-pressure-low-ink" },
  MODERATE: { label: "Moderate", dot: "bg-pressure-mod", solid: "bg-pressure-mod-soft text-pressure-mod-ink" },
  HIGH: { label: "High", dot: "bg-pressure-high", solid: "bg-pressure-high-soft text-pressure-high-ink" },
} as const;

type Props = {
  score: number;
  /** "overlay" sits on photos (frosted), "solid" sits on light surfaces. */
  variant?: "overlay" | "solid";
  showScore?: boolean;
  /** Drops the word "pressure" for tight spots (e.g. side-by-side comparisons on small phones). */
  compact?: boolean;
};

export default function PressureBadge({ score, variant = "solid", showScore = false, compact = false }: Props) {
  const s = STYLES[pressureLevel(score)];
  const surface = variant === "overlay" ? "bg-white/85 text-navy backdrop-blur-md" : s.solid;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 text-[11px] font-bold whitespace-nowrap uppercase ${
        compact ? "px-2 tracking-normal" : "px-2.5 tracking-wide"
      } ${surface}`}
      aria-label={`Estimated tourism pressure: ${s.label}${showScore ? `, ${score} out of 100` : ""}`}
    >
      <span className={`size-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
      {compact ? s.label : `${s.label} pressure`}
      {showScore && <span className="font-semibold tabular-nums opacity-70">· {score}</span>}
    </span>
  );
}
