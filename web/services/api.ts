import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Bike, BikesResponse, Station, StationBikesResponse, StationsResponse, SystemStats } from "@shared/types";
import { useBikeStore } from "@/store/bike";
import { useUi } from "@/store/ui";
import { bareNumber, normalizeNumber } from "@/utils/bikeNumber";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const stationsQuery = { queryKey: ["stations"], queryFn: () => get<StationsResponse>("/api/stations"), refetchInterval: 30_000 };
const freeBikesQuery = { queryKey: ["bikes"], queryFn: () => get<BikesResponse>("/api/bikes"), refetchInterval: 15_000 };
const dockedBikesQuery = { queryKey: ["docked"], queryFn: () => get<BikesResponse>("/api/docked"), refetchInterval: 30_000 };
const stationBikesQuery = (id: string) => ({
  queryKey: ["stationBikes", id],
  queryFn: () => get<StationBikesResponse>(`/api/stations/${encodeURIComponent(id)}/bikes`),
  refetchInterval: 15_000,
});

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

function findNumber(bikes: Bike[], number: string) {
  return bikes.find((b) => b.number.toLowerCase() === number) ?? bikes.find((b) => bareNumber(b.number.toLowerCase()) === bareNumber(number));
}

/**
 * Stations polled live while the bike tab shows them: the open station card, and the station where
 * the docked list last saw the tracked bike. Taken from the docked list, not the merged index, so a
 * live result that no longer has the bike doesn't stop the polling that noticed it.
 */
function useLiveStationIds() {
  const onBikeTab = useUi((s) => s.tab === "bike");
  const openStation = useBikeStore((s) => s.stationId);
  const tracked = useBikeStore((s) => s.trackedNumber);
  const docked = useQuery(dockedBikesQuery).data;
  const trackedStation = useMemo(
    () => (tracked && docked ? (findNumber(docked.bikes, normalizeNumber(tracked))?.stationId ?? null) : null),
    [docked, tracked],
  );
  if (!onBikeTab) return [];
  return [...new Set([openStation, trackedStation].filter((id): id is string => !!id))];
}

function indexBikes([free, docked, ...live]: UseQueryResult<BikesResponse>[]) {
  // Live per-station results replace what the docked list says about those stations; a bike that
  // turns up live at one station is dropped from wherever the older list had it.
  const liveStations = new Map<string, StationBikesResponse>();
  for (const q of live) if (q.data) liveStations.set((q.data as StationBikesResponse).stationId, q.data as StationBikesResponse);
  const liveNumbers = new Set([...liveStations.values()].flatMap((r) => r.bikes.map((b) => b.number)));

  const bikes = new Map<string, Bike>();
  for (const b of docked.data?.bikes ?? []) {
    if (b.stationId && liveStations.has(b.stationId)) continue;
    if (liveNumbers.has(b.number)) continue;
    bikes.set(b.number.toLowerCase(), b);
  }
  for (const r of liveStations.values()) for (const b of r.bikes) bikes.set(b.number.toLowerCase(), b);
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
    /** When a station's number list was last fetched: live if it is being polled, else the docked scan. */
    numbersUpdated: (stationId: string) => liveStations.get(stationId)?.updated ?? docked.data?.updated ?? null,
    error: free.isError || docked.isError,
  };
}

/** Every known bike, keyed by lower-case frame number. */
export function useAllBikes() {
  const liveIds = useLiveStationIds();
  return useQueries({ queries: [freeBikesQuery, dockedBikesQuery, ...liveIds.map(stationBikesQuery)], combine: indexBikes });
}
