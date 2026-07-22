"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export type Page<T> = { rows: T[]; hasMore: boolean };

export type FetchPage<T> = (opts: {
  search: string;
  offset: number;
  limit?: number;
}) => Promise<Page<T>>;

// Client-side driver for server-paginated lists: keeps the loaded rows,
// runs the search on the server (so it covers the whole table, not just
// what's on screen), appends on "Load more", and re-syncs the visible
// window after an edit/delete. The first page comes from the server
// render, so the list paints instantly with no extra round-trip.
export function usePagedList<T>({
  initial,
  fetchPage,
  pageSize,
}: {
  initial: Page<T>;
  fetchPage: FetchPage<T>;
  pageSize: number;
}) {
  const [rows, setRows] = useState<T[]>(initial.rows);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  // Guards against out-of-order search responses: only the latest
  // request's result is applied.
  const reqId = useRef(0);
  const firstRun = useRef(true);

  useEffect(() => {
    // Skip the initial mount — the first page is already rendered.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const q = query.trim();
    const id = ++reqId.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const page = await fetchPage({ search: q, offset: 0 });
        if (reqId.current !== id) return; // a newer search superseded this one
        setRows(page.rows);
        setHasMore(page.hasMore);
      });
    }, 300);
    return () => clearTimeout(timer);
    // fetchPage is a stable server-action reference; query drives this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const loadMore = useCallback(() => {
    startTransition(async () => {
      const page = await fetchPage({ search: query.trim(), offset: rows.length });
      setRows((prev) => [...prev, ...page.rows]);
      setHasMore(page.hasMore);
    });
  }, [fetchPage, query, rows.length]);

  // Re-pull the currently-loaded window in one call, so edits and
  // deletes are reflected without collapsing back to the first page.
  const refresh = useCallback(() => {
    const count = Math.max(pageSize, rows.length);
    const id = ++reqId.current;
    startTransition(async () => {
      const page = await fetchPage({ search: query.trim(), offset: 0, limit: count });
      if (reqId.current !== id) return;
      setRows(page.rows);
      setHasMore(page.hasMore);
    });
  }, [fetchPage, pageSize, query, rows.length]);

  return { rows, hasMore, query, setQuery, loadMore, refresh, pending };
}
