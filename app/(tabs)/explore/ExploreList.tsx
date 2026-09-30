"use client";

import { useState } from "react";
import DestinationCard from "@/components/DestinationCard";
import { DESTINATIONS, INTERESTS, type Interest } from "@/lib/destinations";

type Filter = "All" | "Lower pressure" | Interest;

const FILTERS: Filter[] = ["All", "Lower pressure", ...INTERESTS];

export default function ExploreList({ scores }: { scores: Record<string, number> }) {
  const [filter, setFilter] = useState<Filter>("All");

  const list =
    filter === "All"
      ? DESTINATIONS
      : filter === "Lower pressure"
        ? DESTINATIONS.filter((d) => scores[d.slug] < 70).sort((a, b) => scores[a.slug] - scores[b.slug])
        : DESTINATIONS.filter((d) => d.interests.includes(filter));

  return (
    <>
      <div role="group" aria-label="Filter destinations" className="scrollbar-none mt-4 flex gap-2 overflow-x-auto px-4 py-1">
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f)}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
                active ? "bg-navy text-white" : "bg-surface text-navy ring-1 ring-line hover:bg-navy-soft"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      <p className="mt-4 px-4 text-[13px] text-ink-muted" aria-live="polite">
        {list.length} {list.length === 1 ? "destination" : "destinations"}
      </p>
      <ul className="mt-2 flex flex-col gap-3 px-4">
        {list.map((d) => (
          <li key={d.slug}>
            <DestinationCard destination={d} variant="row" score={scores[d.slug]} />
          </li>
        ))}
      </ul>
    </>
  );
}
