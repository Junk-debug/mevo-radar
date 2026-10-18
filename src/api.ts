import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Bike, BikesResponse, StationsResponse } from "../shared/types";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export const useStations = () =>
  useQuery({ queryKey: ["stations"], queryFn: () => get<StationsResponse>("/api/stations"), refetchInterval: 30_000 });

export const useFreeBikes = () =>
  useQuery({ queryKey: ["bikes"], queryFn: () => get<BikesResponse>("/api/bikes"), refetchInterval: 15_000 });

export const useDockedBikes = () =>
  useQuery({ queryKey: ["docked"], queryFn: () => get<BikesResponse>("/api/docked"), refetchInterval: 60_000 });

export const normalizeNumber = (s: string) => s.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "");
const bare = (n: string) => n.replace(/^e/, "").replace(/^0+/, "");

/** Every known bike, keyed by lower-case frame number. Free-floating data is fresher and wins. */
export function useAllBikes() {
  const free = useFreeBikes();
  const docked = useDockedBikes();
  const bikes = useMemo(() => {
    const map = new Map<string, Bike>();
    for (const b of docked.data?.bikes ?? []) map.set(b.number.toLowerCase(), b);
    for (const b of free.data?.bikes ?? []) map.set(b.number.toLowerCase(), b);
    return map;
  }, [free.data, docked.data]);

  /** "4937" finds "e4937", "366" finds "0366". */
  const resolve = (query: string): string => {
    const q = normalizeNumber(query);
    if (!q || bikes.has(q)) return q;
    const hits = [...bikes.keys()].filter((k) => bare(k) === bare(q));
    return hits.length === 1 ? hits[0] : q;
  };

  return {
    bikes,
    list: useMemo(() => [...bikes.values()], [bikes]),
    resolve,
    freeLoaded: free.isSuccess,
    dockedLoaded: docked.isSuccess,
    dockedUpdated: docked.data?.updated ?? null,
    error: free.error ?? docked.error,
  };
}
