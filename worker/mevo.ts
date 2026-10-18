// Upstream MEVO data sources.
//
// - GBFS (official open data): stations and their counts.
// - Urban Sharing GraphQL (what rowermevo.pl itself uses): bikes with frame numbers.
//   It only accepts requests that look like they come from rowermevo.pl, hence the Origin header.
//   `dockGroupVehicles` has no "all stations" variant, so docked bikes are fetched by batching
//   many aliased per-station fields into one query.

import type { Bike, BikeType, Station } from "../shared/types";

const GBFS = "https://gbfs.urbansharing.com/rowermevo.pl";
const GRAPHQL = "https://core.urbansharing.com/public/api/v1/graphql";
const SYSTEM_ID = "inurba-gdansk";
const VEHICLE_FIELDS = "number batteryCharge currentRange category available";
const STATIONS_PER_QUERY = 40;

interface GbfsStationInfo {
  station_id: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  capacity?: number;
}

interface GbfsStationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available?: number;
  is_renting: boolean;
  is_returning: boolean;
  vehicle_types_available?: { vehicle_type_id: string; count: number }[];
}

interface GqlVehicle {
  number: string;
  batteryCharge: number | null;
  currentRange: number | null;
  category: string;
  available: boolean;
  location?: { location: { lat: number; lng: number } };
}

async function gbfs<T>(feed: string): Promise<{ last_updated: number; data: T }> {
  const res = await fetch(`${GBFS}/${feed}.json`, {
    headers: { "Client-Identifier": "mevo-radar" },
  });
  if (!res.ok) throw new Error(`GBFS ${feed}: HTTP ${res.status}`);
  return res.json();
}

async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      systemId: SYSTEM_ID,
      Origin: "https://rowermevo.pl",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL: HTTP ${res.status}`);
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!body.data) throw new Error(`GraphQL: ${body.errors?.[0]?.message ?? "no data"}`);
  return body.data;
}

function toBike(v: GqlVehicle, lat: number, lon: number, stationId: string | null): Bike {
  return {
    number: v.number,
    type: (v.category === "ebike" ? "ebike" : "bike") as BikeType,
    available: v.available,
    battery: v.batteryCharge ?? null,
    range: v.currentRange ?? null,
    lat,
    lon,
    stationId,
  };
}

async function stationFeeds() {
  const [info, status] = await Promise.all([
    gbfs<{ stations: GbfsStationInfo[] }>("station_information"),
    gbfs<{ stations: GbfsStationStatus[] }>("station_status"),
  ]);
  return { info: info.data.stations, status: status.data.stations, updated: status.last_updated };
}

export async function fetchStations(): Promise<{ updated: number; stations: Station[] }> {
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
      bikes: count("bike"),
      ebikes: count("ebike"),
      docks: s?.num_docks_available ?? 0,
      active: Boolean(s?.is_renting && s?.is_returning),
    };
  });
  return { updated, stations };
}

export async function fetchFreeBikes(): Promise<Bike[]> {
  const data = await graphql<{ freeFloatingVehicles: GqlVehicle[] }>(
    `query($systemId: ID!) { freeFloatingVehicles(systemId: $systemId) { ${VEHICLE_FIELDS} location { location { lat lng } } } }`,
    { systemId: SYSTEM_ID },
  );
  return data.freeFloatingVehicles
    .filter((v) => v.location)
    .map((v) => toBike(v, v.location!.location.lat, v.location!.location.lng, null));
}

export async function fetchDockedBikes(): Promise<Bike[]> {
  const { info, status } = await stationFeeds();
  const coords = new Map(info.map((s) => [s.station_id, s]));
  // Every station, not just ones with available bikes: unavailable bikes (flat battery, service)
  // still stand there and should be findable. ~870 stations → ~22 queries, within the subrequest limit.
  const ids = status.map((s) => s.station_id).filter((id) => /^\d+$/.test(id));

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += STATIONS_PER_QUERY) chunks.push(ids.slice(i, i + STATIONS_PER_QUERY));

  const results = await Promise.all(
    chunks.map((chunk) =>
      graphql<Record<string, GqlVehicle[] | null>>(
        `query { ${chunk.map((id) => `s${id}: dockGroupVehicles(dockGroupId: "${id}") { ${VEHICLE_FIELDS} }`).join(" ")} }`,
      ),
    ),
  );

  const bikes: Bike[] = [];
  for (const result of results) {
    for (const [alias, vehicles] of Object.entries(result)) {
      const id = alias.slice(1);
      const st = coords.get(id);
      if (!st || !vehicles) continue;
      for (const v of vehicles) bikes.push(toBike(v, st.lat, st.lon, id));
    }
  }
  return bikes;
}
