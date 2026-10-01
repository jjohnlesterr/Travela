"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Page<T> = { items: T[]; nextCursor: number | null };
export type FetchPage<T> = (cursor: number, size: number) => Promise<Page<T>>;

/**
 * Cursor pagination that loads the next page when a sentinel element nears the viewport
 * (IntersectionObserver, no scroll listeners). One request at a time, de-duplicated by key,
 * and it stops for good once a page reports no next cursor. Remount (React `key`) to reset.
 */
export function useLazyPages<T>(fetchPage: FetchPage<T>, keyOf: (item: T) => string, pageSize: number, initial?: Page<T>) {
  const [items, setItems] = useState<T[]>(initial?.items ?? []);
  const [cursor, setCursor] = useState<number | null>(initial ? initial.nextCursor : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busy.current || cursor === null) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    try {
      const page = await fetchPage(cursor, pageSize);
      setItems((cur) => {
        const seen = new Set(cur.map(keyOf));
        return [...cur, ...page.items.filter((i) => !seen.has(keyOf(i)))];
      });
      setCursor(page.items.length ? page.nextCursor : null);
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [cursor, fetchPage, keyOf, pageSize]);

  // Re-observe after every page: a fresh observer reports immediately, so a tall screen keeps filling.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || cursor === null || error || loading) return;
    if (typeof IntersectionObserver === "undefined") return; // callers render a "show more" button as the fallback
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void loadMore(), {
      rootMargin: "0px 0px 320px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, error, loading, items.length, loadMore]);

  return { items, loading, error, done: cursor === null, loadMore, sentinel };
}
