// GBFS (official) has stations and counts; frame numbers only come from the Urban Sharing
// GraphQL API behind rowermevo.pl, which answers only requests with its Origin.

import type { z } from "zod";
import type { Bike, BikeType, Station, StationsResponse, SystemStats } from "../shared/types";
import {
  dockGroupVehiclesResult,
  freeBikeStatusFeed,
  freeFloatingVehiclesResult,
  parseUpstream,
  stationInformationFeed,
  stationStatusFeed,
  systemStatsResult,
  type Vehicle,
} from "./schemas";

const GBFS = "https://gbfs.urbansharing.com/rowermevo.pl";
const GRAPHQL = "https://core.urbansharing.com/public/api/v1/graphql";
const SYSTEM_ID = "inurba-gdansk";
const VEHICLE_FIELDS = "number batteryCharge currentRange category available";
const STATIONS_PER_QUERY = 40;
const DOCKED_SCAN_CONCURRENCY = 8; // gentler than all at once, yet a scan still fits the 30 s waitUntil of a stale refresh
const CHUNK_RETRY_DELAY_MS = 1000;
const MAX_FAILED_CHUNK_SHARE = 0.5;
const SUBREQUEST_LIMIT = 50; // Workers free plan, per invocation
const STATION_FEED_REQUESTS = 2;

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function gbfs<T extends z.ZodType>(feed: string, schema: T): Promise<z.infer<T>> {
  const source = `GBFS ${feed}`;
  const res = await fetch(`${GBFS}/${feed}.json`, {
    headers: { "Client-Identifier": "mevo-radar" },
  });
  if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
  return parseUpstream(source, schema, await res.json());
}

async function graphql<T extends z.ZodType>(
  operation: string,
  schema: T,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<z.infer<T>> {
  const source = `GraphQL ${operation}`;
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      systemId: SYSTEM_ID,
      Origin: "https://rowermevo.pl",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
  const body = (await res.json()) as { data?: unknown; errors?: { message?: string }[] } | null;
  if (!body?.data) throw new Error(`${source}: ${body?.errors?.[0]?.message ?? "no data"}`);
  return parseUpstream(source, schema, body.data);
}

function toBike(v: Vehicle, lat: number, lon: number, stationId: string | null, appId: string | null = null): Bike {
  return {
    number: v.number,
    type: (v.category === "ebike" ? "ebike" : "bike") as BikeType,
    available: v.available,
    battery: v.batteryCharge,
    range: v.currentRange,
    lat,
    lon,
    stationId,
    appId,
  };
}

async function stationFeeds() {
  const [info, status] = await Promise.all([
    gbfs("station_information", stationInformationFeed),
    gbfs("station_status", stationStatusFeed),
  ]);
  return { info: info.data.stations, status: status.data.stations, updated: status.last_updated };
}

export async function fetchStations(): Promise<StationsResponse> {
  const { info, status, updated } = await stationFeeds();
  const byId = new Map(status.map((s) => [s.station_id, s]));
  const stations = info.map((st): Station => {
    const s = byId.get(st.station_id);
    const count = (type: string) => s?.vehicle_types_available?.find((v) => v.vehicle_type_id === type)?.count ?? 0;
    return {
      id: st.station_id,
      name: st.name,
      address: st.address ?? "",
      lat: st.lat,
      lon: st.lon,
      capacity: st.capacity ?? 0,
      classicBikes: count("bike"),
      ebikes: count("ebike"),
      freeDocks: s?.num_docks_available ?? 0,
      active: Boolean(s?.is_renting && s?.is_returning),
    };
  });
  return { updated, stations };
}

export async function fetchFreeBikes(): Promise<Bike[]> {
  const [data, gbfsBikes] = await Promise.all([
    graphql(
      "freeFloatingVehicles",
      freeFloatingVehiclesResult,
      `query($systemId: ID!) { freeFloatingVehicles(systemId: $systemId) { ${VEHICLE_FIELDS} location { location { lat lng } } } }`,
      { systemId: SYSTEM_ID },
    ),
    // Only adds app deep-link ids; the bikes are still useful without them.
    gbfs("free_bike_status", freeBikeStatusFeed).catch((e: unknown) => {
      console.warn(`Free bikes served without MEVO app ids: ${errorMessage(e)}`);
      return null;
    }),
  ]);
  // GraphQL has frame numbers, GBFS has the ids the MEVO app links use. Both report the same
  // coordinates for the same bike, so join on exact position (ambiguous positions get no id).
  const byPos = new Map<string, string | null>();
  for (const b of gbfsBikes?.data.bikes ?? []) {
    const key = `${b.lat},${b.lon}`;
    byPos.set(key, byPos.has(key) ? null : b.bike_id);
  }
  return data.freeFloatingVehicles.flatMap((v) => {
    if (!v.location) return [];
    const { lat, lng } = v.location.location;
    return [toBike(v, lat, lng, null, byPos.get(`${lat},${lng}`) ?? null)];
  });
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const data = await graphql(
    "systemStats",
    systemStatsResult,
    `query { systemActiveTripCount { count } systemStats { tripsToday tripsYesterday highscoreTrips tripsThisYear tripsLastYear
    uniqueUsersToday highscoreUniqueUsers highscoreUniqueUsersDate medianDurationToday medianDurationThisYear } }`,
  );
  const s = data.systemStats;
  return {
    updated: Math.floor(Date.now() / 1000),
    activeTrips: data.systemActiveTripCount?.count ?? 0,
    tripsToday: s.tripsToday,
    tripsYesterday: s.tripsYesterday,
    tripsThisYear: s.tripsThisYear,
    tripsLastYear: s.tripsLastYear,
    uniqueUsersToday: s.uniqueUsersToday,
    recordTrips: s.highscoreTrips,
    recordUsers: s.highscoreUniqueUsers,
    recordUsersDate: s.highscoreUniqueUsersDate,
    medianDurationToday: s.medianDurationToday,
    medianDurationThisYear: s.medianDurationThisYear,
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `task` over `items` with at most `limit` in flight; results keep the input order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runner = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

/**
 * Bikes standing at stations. A station chunk that fails twice is skipped so one upstream hiccup
 * (e.g. a 504) doesn't lose the whole scan; if most chunks fail, it throws so callers keep the previous data.
 */
export async function fetchDockedBikes(): Promise<Bike[]> {
  const { info, status } = await stationFeeds();
  const coords = new Map(info.map((s) => [s.station_id, s]));
  // Every station, not just ones with available bikes: unavailable bikes (flat battery, service)
  // still stand there and should be findable. ~870 stations → ~22 queries, within the subrequest limit.
  const ids = status.map((s) => s.station_id).filter((id) => /^\d+$/.test(id));

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += STATIONS_PER_QUERY) chunks.push(ids.slice(i, i + STATIONS_PER_QUERY));

  const queryChunk = (chunk: string[]) =>
    graphql(
      "dockGroupVehicles",
      dockGroupVehiclesResult,
      `query { ${chunk.map((id) => `s${id}: dockGroupVehicles(dockGroupId: "${id}") { ${VEHICLE_FIELDS} }`).join(" ")} }`,
    );

  // Retries share whatever the first attempts leave of the subrequest limit.
  let retriesLeft = SUBREQUEST_LIMIT - STATION_FEED_REQUESTS - chunks.length;
  const results = await mapWithConcurrency(chunks, DOCKED_SCAN_CONCURRENCY, async (chunk, index) => {
    const label = `Docked chunk ${index + 1}/${chunks.length} (stations ${chunk[0]}-${chunk[chunk.length - 1]})`;
    try {
      return await queryChunk(chunk);
    } catch (firstError) {
      if (retriesLeft <= 0) {
        console.warn(`${label} skipped, no subrequests left to retry: ${errorMessage(firstError)}`);
        return null;
      }
      retriesLeft--;
      await delay(CHUNK_RETRY_DELAY_MS);
      try {
        return await queryChunk(chunk);
      } catch (retryError) {
        console.warn(`${label} skipped after a retry: ${errorMessage(retryError)}`);
        return null;
      }
    }
  });

  const failedChunks = results.filter((result) => result === null).length;
  if (failedChunks > chunks.length * MAX_FAILED_CHUNK_SHARE) {
    throw new Error(`Docked scan failed: ${failedChunks} of ${chunks.length} station chunks failed`);
  }

  const bikes: Bike[] = [];
  for (const result of results) {
    for (const [alias, vehicles] of Object.entries(result ?? {})) {
      const id = alias.slice(1);
      const st = coords.get(id);
      if (!st || !vehicles) continue;
      for (const v of vehicles) bikes.push(toBike(v, st.lat, st.lon, id));
    }
  }
  return bikes;
}
