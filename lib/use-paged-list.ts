"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export type Page<T> = { rows: T[]; hasMore: boolean };

// Optional extra filters some lists pass to the server alongside the
// search text (e.g. the invoices page's party type / paid status).
export type ListFilters = { partyType?: string; status?: string };

export type FetchPage<T> = (opts: {
  search: string;
  offset: number;
  limit?: number;
} & ListFilters) => Promise<Page<T>>;

// Client-side driver for server-paginated lists: keeps the loaded rows,
// runs the search on the server (so it covers the whole table, not just
// what's on screen), appends on "Load more", and re-syncs the visible
// window after an edit/delete. The first page comes from the server
// render, so the list paints instantly with no extra round-trip.
//
// `filters` are re-applied on the server; changing them re-fetches from
// the first page, just like changing the search text.
export function usePagedList<T>({
  initial,
  fetchPage,
  pageSize,
  filters,
}: {
  initial: Page<T>;
  fetchPage: FetchPage<T>;
  pageSize: number;
  filters?: ListFilters;
}) {
  const [rows, setRows] = useState<T[]>(initial.rows);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  // Guards against out-of-order search responses: only the latest
  // request's result is applied.
  const reqId = useRef(0);
  const firstRun = useRef(true);
  const filtersKey = JSON.stringify(filters ?? {});

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
        const page = await fetchPage({ search: q, offset: 0, ...(filters ?? {}) });
        if (reqId.current !== id) return; // a newer request superseded this one
        setRows(page.rows);
        setHasMore(page.hasMore);
      });
    }, 300);
    return () => clearTimeout(timer);
    // fetchPage is a stable server-action reference; query + filters drive this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filtersKey]);

  const loadMore = useCallback(() => {
    startTransition(async () => {
      const page = await fetchPage({ search: query.trim(), offset: rows.length, ...(filters ?? {}) });
      setRows((prev) => [...prev, ...page.rows]);
      setHasMore(page.hasMore);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, query, rows.length, filtersKey]);

  // Re-pull the currently-loaded window in one call, so edits and
  // deletes are reflected without collapsing back to the first page.
  const refresh = useCallback(() => {
    const count = Math.max(pageSize, rows.length);
    const id = ++reqId.current;
    startTransition(async () => {
      const page = await fetchPage({ search: query.trim(), offset: 0, limit: count, ...(filters ?? {}) });
      if (reqId.current !== id) return;
      setRows(page.rows);
      setHasMore(page.hasMore);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, pageSize, query, rows.length, filtersKey]);

  return { rows, hasMore, query, setQuery, loadMore, refresh, pending };
}
