// FOSSGIS OSRM: the OSRM demo server ignores the profile and always routes by car.
// Every call falls back to a straight-line estimate so planning never blocks on it.

import { haversine, type LatLon } from "./geo";

const OSRM = "https://routing.openstreetmap.de";
const DETOUR_FACTOR = 1.3;
const SPEED = { walk: 1.3, bike: 4.2 }; // m/s: ~4.7 km/h walking, ~15 km/h on a city bike

export type TravelMode = keyof typeof SPEED;

export interface Leg {
  mode: TravelMode;
  from: LatLon;
  to: LatLon;
  distance: number; // metres
  duration: number; // seconds
  line: LatLon[]; // [lat, lon] points
}

const profileOf = (mode: TravelMode) => (mode === "walk" ? "routed-foot" : "routed-bike");
const coords = (points: LatLon[]) => points.map(([lat, lon]) => `${lon},${lat}`).join(";");

// The FOSSGIS server rate-limits bursts (HTTP 429); retry once after a short pause.
async function getJson(url: string) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    return res.json();
  }
}

export async function routeLeg(mode: TravelMode, from: LatLon, to: LatLon): Promise<Leg> {
  try {
    const data = await getJson(`${OSRM}/${profileOf(mode)}/route/v1/driving/${coords([from, to])}?overview=full&geometries=geojson`);
    const r = data.routes?.[0] as { distance: number; duration: number; geometry: { coordinates: [number, number][] } } | undefined;
    if (!r) throw new Error("OSRM: no route");
    const line = r.geometry.coordinates.map(([lon, lat]) => [lat, lon] as LatLon);
    // The bike profile assumes fast riding; MEVO bikes in city traffic average about 15 km/h.
    const duration = Math.max(r.duration, r.distance / SPEED[mode]);
    return { mode, from, to, distance: r.distance, duration, line };
  } catch {
    const distance = haversine(from, to) * DETOUR_FACTOR;
    return { mode, from, to, distance, duration: distance / SPEED[mode], line: [from, to] };
  }
}

/** Walking distance from one point to many, in a single request (OSRM table service). */
export async function walkingDistances(from: LatLon, targets: LatLon[]): Promise<number[]> {
  const estimate = () => targets.map((t) => haversine(from, t) * DETOUR_FACTOR);
  if (!targets.length) return [];
  try {
    const data = await getJson(`${OSRM}/routed-foot/table/v1/driving/${coords([from, ...targets])}?sources=0&annotations=distance`);
    const row: (number | null)[] | undefined = data.distances?.[0];
    if (!row) return estimate();
    const fallback = estimate();
    return targets.map((_, i) => row[i + 1] ?? fallback[i]);
  } catch {
    return estimate();
  }
}
