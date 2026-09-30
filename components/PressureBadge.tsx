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
};

export default function PressureBadge({ score, variant = "solid", showScore = false }: Props) {
  const s = STYLES[pressureLevel(score)];
  const surface = variant === "overlay" ? "bg-white/85 text-navy backdrop-blur-md" : s.solid;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${surface}`}
      aria-label={`Estimated tourism pressure: ${s.label}${showScore ? `, ${score} out of 100` : ""}`}
    >
      <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label} pressure
      {showScore && <span className="font-semibold tabular-nums opacity-70">· {score}</span>}
    </span>
  );
}
