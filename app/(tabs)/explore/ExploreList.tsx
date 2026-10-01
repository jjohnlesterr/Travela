"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import DestinationCard from "@/components/DestinationCard";
import { DESTINATIONS, INTERESTS, type Destination, type Interest } from "@/lib/destinations";
import { useLazyPages, type FetchPage, type Page } from "@/lib/useLazyPages";

type Filter = "All" | "Lower pressure" | Interest;

const FILTERS: Filter[] = ["All", "Lower pressure", ...INTERESTS];

/** Rows are ~112 px tall, so 6 fills a phone screen with the next page loading just below the fold. */
const PAGE_SIZE = 6;

const slugOf = (d: Destination) => d.slug;

function pageOf(list: Destination[], cursor: number, size: number): Page<Destination> {
  const next = cursor + size;
  return { items: list.slice(cursor, next), nextCursor: next < list.length ? next : null };
}

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
      {/* Remount per filter so paging restarts from the first batch. */}
      <Results key={filter} list={list} scores={scores} />
    </>
  );
}

function Results({ list, scores }: { list: Destination[]; scores: Record<string, number> }) {
  // Source of each batch. Today: the curated catalog, already in memory (scores come from one Supabase read).
  // To page cached destinations from Supabase instead, swap this for a `.range(cursor, cursor + size - 1)`
  // query on destination_cache returning the same { items, nextCursor } shape — never an Apify run.
  const fetchPage = useCallback<FetchPage<Destination>>(async (cursor, size) => pageOf(list, cursor, size), [list]);
  // The first batch is rendered on the server; later batches load as the user nears the end.
  const [first] = useState(() => pageOf(list, 0, PAGE_SIZE));

  const { items, loading, error, done, loadMore, sentinel } = useLazyPages(fetchPage, slugOf, PAGE_SIZE, first);

  return (
    <>
      <ul className="mt-2 flex flex-col gap-3 px-4">
        {items.map((d) => (
          <li key={d.slug}>
            <DestinationCard destination={d} variant="row" score={scores[d.slug]} />
          </li>
        ))}
        {loading &&
          Array.from({ length: items.length ? 2 : 3 }, (_, i) => (
            <li key={`skeleton-${i}`} aria-hidden className="flex items-center gap-3.5 rounded-3xl bg-surface p-2.5 shadow-card">
              <div className="size-[88px] shrink-0 animate-pulse rounded-2xl bg-navy-soft" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 animate-pulse rounded-full bg-navy-soft" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-navy-soft" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-navy-soft" />
              </div>
            </li>
          ))}
      </ul>

      <div ref={sentinel} className="px-4 pt-3">
        {loading ? (
          <p role="status" className="flex items-center justify-center gap-2 text-[13px] text-ink-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading more destinations…
          </p>
        ) : error ? (
          <button type="button" onClick={loadMore} className="flex h-11 w-full items-center justify-center rounded-2xl bg-surface text-sm font-semibold text-navy ring-1 ring-line">
            Couldn&apos;t load more — tap to retry
          </button>
        ) : !done ? (
          // Normally the observer loads the next batch first; this keeps it reachable by keyboard and older browsers.
          <button type="button" onClick={loadMore} className="flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold text-ocean hover:bg-navy-soft">
            Show more destinations
          </button>
        ) : (
          items.length > PAGE_SIZE && <p className="text-center text-[13px] text-ink-muted">That&apos;s every destination for now.</p>
        )}
      </div>
    </>
  );
}
