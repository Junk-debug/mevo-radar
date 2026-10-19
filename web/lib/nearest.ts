// A place is a whole station or one bike outside a station, so the results are three
// different spots rather than three bikes at the same station.

import type { Bike, Meters, Station } from "@shared/types";
import { haversine, type LatLon } from "./geo";
import { walkingDistances } from "./routing";

const MIN_EBIKE_BATTERY_PERCENT = 15; // below this an e-bike won't take you far
const STRAIGHT_LINE_CANDIDATES = 10;
const RESULTS = 3;
const WALK_SPEED_MPS = 1.3;

export interface NearbyPlace {
  key: string;
  pos: LatLon;
  station: Station | null;
  bestBike: Bike; // e-bike with the most battery, else a classic one
  count: number;
  walkDistance: Meters;
  minutes: number;
}

const usable = (b: Bike) => b.available && (b.type === "bike" || (b.battery ?? 0) >= MIN_EBIKE_BATTERY_PERCENT);
const score = (b: Bike) => (b.type === "ebike" ? 1000 + (b.battery ?? 0) : 0);

export async function findNearest(from: LatLon, bikes: Bike[], stationsById: Map<string, Station>): Promise<NearbyPlace[]> {
  const places = new Map<string, { pos: LatLon; station: Station | null; bikes: Bike[] }>();
  for (const b of bikes) {
    if (!usable(b)) continue;
    const key = b.stationId ? `s:${b.stationId}` : `b:${b.number}`;
    const place = places.get(key) ?? { pos: [b.lat, b.lon], station: b.stationId ? (stationsById.get(b.stationId) ?? null) : null, bikes: [] };
    place.bikes.push(b);
    places.set(key, place);
  }

  const candidates = [...places.entries()]
    .map(([key, p]) => ({ key, ...p, d: haversine(from, p.pos) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, STRAIGHT_LINE_CANDIDATES);
  const walks = await walkingDistances(from, candidates.map((c) => c.pos));

  return candidates
    .map((c, i) => {
      const bestBike = [...c.bikes].sort((a, b) => score(b) - score(a))[0];
      return { key: c.key, pos: c.pos, station: c.station, bestBike, count: c.bikes.length, walkDistance: walks[i], minutes: Math.max(1, Math.round(walks[i] / WALK_SPEED_MPS / 60)) };
    })
    .sort((a, b) => a.walkDistance - b.walkDistance)
    .slice(0, RESULTS);
}
