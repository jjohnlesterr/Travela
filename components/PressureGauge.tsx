import type { PressureLevel } from "@/lib/destinations";

const COLOR: Record<PressureLevel, string> = {
  LOW: "var(--color-pressure-low)",
  MODERATE: "var(--color-pressure-mod)",
  HIGH: "var(--color-pressure-high)",
};

const LABEL: Record<PressureLevel, string> = { LOW: "Low", MODERATE: "Moderate", HIGH: "High" };

/** Semicircle gauge, 0–100. Static SVG — no client JS. */
export default function PressureGauge({ score, level }: { score: number; level: PressureLevel }) {
  const arc = "M 16 96 A 80 80 0 0 1 176 96";
  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg
        viewBox="0 0 192 108"
        className="w-full"
        role="img"
        aria-label={`Estimated tourism pressure ${score} out of 100, ${LABEL[level]}`}
      >
        <path d={arc} fill="none" stroke="var(--color-line)" strokeWidth="16" strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={COLOR[level]}
          strokeWidth="16"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(score, 1)} 100`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center" aria-hidden>
        <p className="font-display text-5xl leading-none font-black text-navy tabular-nums">{score}</p>
        <p className="mt-1 text-[13px] font-semibold text-ink-muted">out of 100</p>
      </div>
    </div>
  );
}
