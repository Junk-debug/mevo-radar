import { useEffect, useRef, useState } from "react";
import type { Bike } from "../../../shared/types";
import { normalizeNumber, type AllBikes } from "../../api";
import { load, save } from "../../lib/storage";

const TRACK_KEY = "mevo.tracked";

const numberFromHash = () => normalizeNumber(decodeURIComponent(location.hash.slice(1))) || null;

/** The followed bike, persisted and mirrored in the URL hash so `#e4937` links work. */
export function useTracking(all: AllBikes) {
  const [number, setNumber] = useState<string | null>(() => numberFromHash() ?? load(TRACK_KEY));
  const bike = number ? (all.bikes.get(number) ?? null) : null;

  // Keep the last known position so a bike that just left on a trip can still be shown.
  const lastSeen = useRef<Bike | null>(null);
  if (bike) lastSeen.current = bike;
  else if (lastSeen.current?.number.toLowerCase() !== number) lastSeen.current = null;

  const track = (query: string) => {
    const key = all.resolve(query);
    setNumber(key);
    save(TRACK_KEY, key);
    history.replaceState(null, "", `#${key}`);
    return all.bikes.get(key) ?? null;
  };

  const untrack = () => {
    setNumber(null);
    save(TRACK_KEY, null);
    history.replaceState(null, "", location.pathname);
  };

  // A link like "#4937" can only be resolved to "e4937" once the bike data has loaded.
  useEffect(() => {
    if (!number || all.bikes.has(number)) return;
    const resolved = all.resolve(number);
    if (resolved !== number && all.bikes.has(resolved)) setNumber(resolved);
  }, [all, number]);

  useEffect(() => {
    const onHashChange = () => {
      const n = numberFromHash();
      if (n) track(n);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  });

  return { number, bike, lastSeen: lastSeen.current, track, untrack };
}
