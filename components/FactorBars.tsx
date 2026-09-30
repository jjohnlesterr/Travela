import type { Factors } from "@/lib/pressure";
import { WEIGHTS } from "@/lib/pressure";

const ROWS: { key: keyof Factors; label: string; hint: string }[] = [
  { key: "density", label: "Tourism density", hint: "Hotels, attractions and eateries near the center" },
  { key: "popularity", label: "Popularity", hint: "Review activity on Google Maps" },
  { key: "seasonality", label: "Season", hint: "Peak, shoulder or off-peak this month" },
  { key: "environment", label: "Environment", hint: "How sensitive the setting is to visitors" },
];

function tone(v: number) {
  if (v >= 70) return "bg-pressure-high";
  if (v >= 40) return "bg-pressure-mod";
  return "bg-pressure-low";
}

export default function FactorBars({ factors }: { factors: Factors }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {ROWS.map(({ key, label, hint }) => {
        const v = factors[key];
        return (
          <li key={key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] font-semibold text-navy">
                {label} <span className="font-normal text-ink-muted">· {Math.round(WEIGHTS[key] * 100)}% weight</span>
              </p>
              <p className="text-[14px] font-bold text-navy tabular-nums">{v}</p>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={v}
            >
              <div className={`h-full rounded-full ${tone(v)}`} style={{ width: `${Math.max(v, 2)}%` }} />
            </div>
            <p className="mt-1 text-[12px] leading-snug text-ink-muted">{hint}</p>
          </li>
        );
      })}
    </ul>
  );
}
