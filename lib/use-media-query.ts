"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the viewport matches the given media query.
 * SSR-safe: starts false on the server and first client paint, then syncs
 * on mount and stays in sync on resize/orientation change.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * True on phones and tablets (below the lg / 1024px breakpoint), where the
 * list/table view is cramped and the card grid reads better. Used to force
 * grid view and hide the list/grid toggle on small screens.
 */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
