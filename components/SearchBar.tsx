"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe2, MapPin, Search } from "lucide-react";
import { searchDestinations, slugify } from "@/lib/destinations";

type Remote = { slug: string; name: string; detail: string };

type Props = {
  /** "destination" opens the destination screen, "plan" selects it for trip planning. */
  mode?: "destination" | "plan";
  placeholder?: string;
  label?: string;
};

export default function SearchBar({
  mode = "destination",
  placeholder = "Search a destination",
  label = "Where do you want to go?",
}: Props) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<{ q: string; items: Remote[] }>({ q: "", items: [] });
  const q = query.trim();
  // Curated catalog matches are instant; any other place is geocoded server-side (free, no Apify spend).
  const results = searchDestinations(query).slice(0, 5);
  const remoteEnabled = mode === "destination" && q.length >= 3;
  const others = remoteEnabled && remote.q === q ? remote.items.slice(0, 5 - Math.min(results.length, 2)) : [];

  useEffect(() => {
    if (!remoteEnabled) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const json = (await res.json()) as { results: Remote[] };
        setRemote({ q, items: json.results ?? [] });
      } catch {
        /* suggestions are best-effort */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, remoteEnabled]);

  function go(slug: string) {
    setOpen(false);
    router.push(mode === "plan" ? `/plan?d=${slug}` : `/d/${slug}`);
  }

  function submit() {
    if (results[0]) return go(results[0].slug);
    if (others[0]) return go(others[0].slug);
    // Free text: the analysis route geocodes it and redirects to the canonical destination.
    if (mode === "destination" && slugify(q)) go(slugify(q));
  }

  const canSubmit = mode === "destination" ? slugify(q).length > 0 : results.length > 0;

  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex h-14 items-center gap-2.5 rounded-2xl bg-surface pr-2 pl-3.5 shadow-float ring-1 ring-line/70 focus-within:ring-2 focus-within:ring-ocean"
      >
        <Search className="size-5 shrink-0 text-ocean" aria-hidden />
        <label htmlFor={listId + "-input"} className="sr-only">
          {label}
        </label>
        <input
          id={listId + "-input"}
          type="search"
          role="combobox"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          aria-controls={listId}
          aria-expanded={open && query.length > 0}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-navy outline-none placeholder:text-ink-muted/80 focus-visible:outline-none max-[359px]:placeholder:text-sm"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white transition-colors hover:bg-ocean active:scale-95 disabled:bg-navy-soft disabled:text-navy/50"
          disabled={!canSubmit}
        >
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </form>

      {open && query.trim().length > 0 && (
        <ul
          id={listId}
          className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl bg-surface py-1.5 shadow-float ring-1 ring-line/70"
        >
          {results.length || others.length ? (
            <>
            {results.map((d) => (
              <li key={d.slug}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(d.slug)}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sand active:bg-navy-soft"
                >
                  <MapPin className="size-4 shrink-0 text-leaf" aria-hidden />
                  <span className="font-semibold text-navy">{d.name}</span>
                  <span className="truncate text-sm text-ink-muted">{d.region}</span>
                </button>
              </li>
            ))}
            {others.map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(p.slug)}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sand active:bg-navy-soft"
                >
                  <Globe2 className="size-4 shrink-0 text-ocean" aria-hidden />
                  <span className="shrink-0 font-semibold text-navy">{p.name}</span>
                  <span className="truncate text-sm text-ink-muted">{p.detail}</span>
                </button>
              </li>
            ))}
            </>
          ) : (
            <li className="px-4 py-3 text-sm text-ink-muted">
              {mode === "destination" ? `Press search to look up “${q}”.` : "No match yet. Try Boracay, Siquijor or El Nido."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
