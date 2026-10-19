import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Bike, BikesResponse, Station, StationsResponse, SystemStats } from "@shared/types";
import { bareNumber, normalizeNumber } from "@/utils/bikeNumber";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const stationsQuery = { queryKey: ["stations"], queryFn: () => get<StationsResponse>("/api/stations"), refetchInterval: 30_000 };
const freeBikesQuery = { queryKey: ["bikes"], queryFn: () => get<BikesResponse>("/api/bikes"), refetchInterval: 15_000 };
const dockedBikesQuery = { queryKey: ["docked"], queryFn: () => get<BikesResponse>("/api/docked"), refetchInterval: 60_000 };

export const useSystemStats = () =>
  useQuery({ queryKey: ["stats"], queryFn: () => get<SystemStats>("/api/stats"), refetchInterval: 30_000 });

// Module-level so TanStack Query reuses the result until the data itself changes.
function indexStations(data: StationsResponse) {
  return { stations: data.stations, byId: new Map(data.stations.map((s) => [s.id, s])), updated: data.updated };
}

const NO_STATIONS = { stations: [] as Station[], byId: new Map<string, Station>(), updated: null };

export function useStationsData() {
  const q = useQuery({ ...stationsQuery, select: indexStations });
  return { ...(q.data ?? NO_STATIONS), error: q.isError };
}

function indexBikes([free, docked]: [UseQueryResult<BikesResponse>, UseQueryResult<BikesResponse>]) {
  const bikes = new Map<string, Bike>();
  for (const b of docked.data?.bikes ?? []) bikes.set(b.number.toLowerCase(), b);
  for (const b of free.data?.bikes ?? []) bikes.set(b.number.toLowerCase(), b); // fresher data wins
  const list = [...bikes.values()];
  /** Forgiving lookup: "4937" finds "e4937", "366" finds "0366". */
  const resolve = (query: string) => {
    const q = normalizeNumber(query);
    if (!q || bikes.has(q)) return q;
    const hits = [...bikes.keys()].filter((k) => bareNumber(k) === bareNumber(q));
    return hits.length === 1 ? hits[0] : q;
  };
  return {
    bikes,
    list,
    freeBikes: list.filter((b) => !b.stationId),
    resolve,
    dockedLoaded: docked.isSuccess,
    dockedUpdated: docked.data?.updated ?? null,
    error: free.isError || docked.isError,
  };
}

/** Every known bike, keyed by lower-case frame number. */
export const useAllBikes = () => useQueries({ queries: [freeBikesQuery, dockedBikesQuery], combine: indexBikes });
