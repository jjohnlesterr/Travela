"use client";

type Props = { days: number[]; active: number; onChange: (day: number) => void; panelId: string };

/** Horizontal day switcher (Day 1 · Day 2 …). Renders nothing for single-day trips. */
export default function DayTabs({ days, active, onChange, panelId }: Props) {
  if (days.length < 2) return null;
  return (
    <div role="tablist" aria-label="Trip days" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      {days.map((day) => {
        const selected = day === active;
        return (
          <button
            key={day}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId}
            onClick={() => onChange(day)}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
              selected ? "bg-navy text-white" : "bg-surface text-navy ring-1 ring-line hover:bg-navy-soft"
            }`}
          >
            Day {day}
          </button>
        );
      })}
    </div>
  );
}
