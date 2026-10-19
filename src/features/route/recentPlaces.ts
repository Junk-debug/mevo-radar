import type { LatLon } from "../../lib/geo";
import { load, save } from "../../lib/storage";

export interface SavedPlace {
  label: string;
  detail: string;
  coords: LatLon;
}

const KEY = "mevo.recentPlaces";
const LIMIT = 5;

export function recentPlaces(): SavedPlace[] {
  try {
    const list = JSON.parse(load(KEY) ?? "[]");
    return Array.isArray(list) ? list.slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

export function rememberPlace(place: SavedPlace) {
  const rest = recentPlaces().filter((p) => p.label !== place.label);
  save(KEY, JSON.stringify([place, ...rest].slice(0, LIMIT)));
}
