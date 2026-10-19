import { useQuery } from "@tanstack/react-query";
import type { Bike, BikesResponse, Station, StationsResponse, SystemStats } from "@shared/types";
import { bareNumber, normalizeNumber } from "@/lib/bikeNumber";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const useStationsQuery = () =>
  useQuery({ queryKey: ["stations"], queryFn: () => get<StationsResponse>("/api/stations"), refetchInterval: 30_000 });
const useFreeBikes = () =>
  useQuery({ queryKey: ["bikes"], queryFn: () => get<BikesResponse>("/api/bikes"), refetchInterval: 15_000 });
const useDockedBikes = () =>
  useQuery({ queryKey: ["docked"], queryFn: () => get<BikesResponse>("/api/docked"), refetchInterval: 60_000 });

export const useSystemStats = () =>
  useQuery({ queryKey: ["stats"], queryFn: () => get<SystemStats>("/api/stats"), refetchInterval: 30_000 });

// Many components read these; derive once per data update, not once per component.
function memoOn<A extends object | undefined, B extends object | undefined, R>(fn: (a: A, b: B) => R) {
  let last: { a: A; b: B; result: R } | null = null;
  return (a: A, b: B) => {
    if (!last || last.a !== a || last.b !== b) last = { a, b, result: fn(a, b) };
    return last.result;
  };
}

const indexStations = memoOn((data: StationsResponse | undefined, _: undefined) => {
  const stations = data?.stations ?? [];
  return { stations, byId: new Map(stations.map((s) => [s.id, s])) as Map<string, Station> };
});

const indexBikes = memoOn((free: BikesResponse | undefined, docked: BikesResponse | undefined) => {
  const bikes = new Map<string, Bike>();
  for (const b of docked?.bikes ?? []) bikes.set(b.number.toLowerCase(), b);
  for (const b of free?.bikes ?? []) bikes.set(b.number.toLowerCase(), b); // fresher data wins
  const list = [...bikes.values()];
  /** Forgiving lookup: "4937" finds "e4937", "366" finds "0366". */
  const resolve = (query: string) => {
    const q = normalizeNumber(query);
    if (!q || bikes.has(q)) return q;
    const hits = [...bikes.keys()].filter((k) => bareNumber(k) === bareNumber(q));
    return hits.length === 1 ? hits[0] : q;
  };
  return { bikes, list, freeBikes: list.filter((b) => !b.stationId), resolve };
});

export function useStationsData() {
  const q = useStationsQuery();
  return { ...indexStations(q.data, undefined), updated: q.data?.updated ?? null, error: q.isError };
}

/** Every known bike, keyed by lower-case frame number. */
export function useAllBikes() {
  const free = useFreeBikes();
  const docked = useDockedBikes();
  return {
    ...indexBikes(free.data, docked.data),
    dockedLoaded: docked.isSuccess,
    dockedUpdated: docked.data?.updated ?? null,
    error: free.isError || docked.isError,
  };
}
