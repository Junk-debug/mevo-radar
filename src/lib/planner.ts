// Walk → bike → walk. Stations are chosen by real walking distance, not straight-line
// distance: the closest station on the map can be a long walk around rail lines or water.

import type { Bike, BikeType, Station } from "../../shared/types";
import { haversine, type LatLon } from "./geo";
import { routeLeg, walkingDistances, type Leg } from "./routing";

export type BikePreference = "any" | BikeType;

const SEARCH_RADIUS = 3000;
const CANDIDATES = 5;
export const LOW_COUNT = 2; // 1–2 bikes/docks left → warn

export const stationPos = (s: { lat: number; lon: number }): LatLon => [s.lat, s.lon];

export function bikesAt(s: Station, pref: BikePreference): number {
  return pref === "ebike" ? s.ebikes : pref === "bike" ? s.bikes : s.bikes + s.ebikes;
}

const matches = (b: Bike, pref: BikePreference) => b.available && (pref === "any" || b.type === pref);

async function bestStation(
  stations: Station[],
  near: LatLon,
  usable: (s: Station) => boolean,
): Promise<{ station: Station; walk: number } | null> {
  const candidates = stations
    .filter((s) => s.active && usable(s))
    .map((s) => ({ s, d: haversine(near, stationPos(s)) }))
    .filter((c) => c.d <= SEARCH_RADIUS)
    .sort((a, b) => a.d - b.d)
    .slice(0, CANDIDATES);
  if (!candidates.length) return null;
  const walks = await walkingDistances(near, candidates.map((c) => stationPos(c.s)));
  const i = walks.indexOf(Math.min(...walks));
  return { station: candidates[i].s, walk: walks[i] };
}

function nearestFreeBike(bikes: Bike[], near: LatLon, pref: BikePreference) {
  let best: { bike: Bike; distance: number } | null = null;
  for (const bike of bikes) {
    if (bike.stationId || !matches(bike, pref)) continue;
    const distance = haversine(near, [bike.lat, bike.lon]);
    if (distance <= SEARCH_RADIUS && (!best || distance < best.distance)) best = { bike, distance };
  }
  return best;
}

export type Pickup =
  | { kind: "station"; station: Station; bikes: Bike[]; pos: LatLon }
  | { kind: "bike"; bike: Bike; pos: LatLon };

export interface TripPlan {
  from: LatLon;
  to: LatLon;
  pickup: Pickup;
  dropoff: Station;
  legs: [Leg, Leg, Leg];
  /** A free-floating bike closer than the pickup station, if any. */
  closerFreeBike: { bike: Bike; distance: number } | null;
  /** Suggested when the drop-off station is almost full. */
  dropoffAlternative: Station | null;
}

export type PlanError = "noBikes" | "noDocks";

export async function planTrip(
  from: LatLon,
  to: LatLon,
  pref: BikePreference,
  stations: Station[],
  bikes: Bike[],
): Promise<TripPlan | PlanError> {
  const [pickStation, drop] = await Promise.all([
    bestStation(stations, from, (s) => bikesAt(s, pref) > 0),
    bestStation(stations, to, (s) => s.docks > 0),
  ]);
  const freeBike = nearestFreeBike(bikes, from, pref);
  if (!drop) return "noDocks";

  let pickup: Pickup;
  if (pickStation) {
    const here = bikes
      .filter((b) => b.stationId === pickStation.station.id && matches(b, pref))
      .sort((a, b) => (b.battery ?? -1) - (a.battery ?? -1));
    pickup = { kind: "station", station: pickStation.station, bikes: here, pos: stationPos(pickStation.station) };
  } else if (freeBike) {
    pickup = { kind: "bike", bike: freeBike.bike, pos: [freeBike.bike.lat, freeBike.bike.lon] };
  } else {
    return "noBikes";
  }

  const dropPos = stationPos(drop.station);
  const legs = await Promise.all([
    routeLeg("walk", from, pickup.pos),
    routeLeg("bike", pickup.pos, dropPos),
    routeLeg("walk", dropPos, to),
  ]);

  const closerFreeBike =
    pickup.kind === "station" && freeBike && freeBike.distance < legs[0].distance ? freeBike : null;

  const dropoffAlternative =
    drop.station.docks <= LOW_COUNT
      ? (stations
          .filter((s) => s.active && s.id !== drop.station.id && s.docks > LOW_COUNT)
          .map((s) => ({ s, d: haversine(to, stationPos(s)) }))
          .sort((a, b) => a.d - b.d)[0]?.s ?? null)
      : null;

  return { from, to, pickup, dropoff: drop.station, legs, closerFreeBike, dropoffAlternative };
}

export function googleMapsUrl(plan: TripPlan): string {
  const p = (c: LatLon) => `${c[0]},${c[1]}`;
  const params = new URLSearchParams({
    api: "1",
    origin: p(plan.from),
    destination: p(plan.to),
    waypoints: `${p(plan.pickup.pos)}|${p(stationPos(plan.dropoff))}`,
    travelmode: "bicycling",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

export function walkingDirectionsUrl(to: LatLon): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to[0]},${to[1]}&travelmode=walking`;
}
