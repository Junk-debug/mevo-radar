import type { FeatureCollection } from "geojson";
import type { Map as MlMap } from "maplibre-gl";
import type { Bike, Station } from "../../shared/types";
import type { LatLon } from "../lib/geo";
import { LOW_COUNT, type TripPlan } from "../lib/planner";

export const toLngLat = ([lat, lon]: LatLon): [number, number] => [lon, lat];

const collection = (features: FeatureCollection["features"]): FeatureCollection => ({ type: "FeatureCollection", features });

export const stationsData = (stations: Station[]) =>
  collection(
    stations
      .filter((s) => s.active)
      .map((s) => {
        const total = s.bikes + s.ebikes;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          properties: { id: s.id, total, level: total === 0 ? 0 : total <= LOW_COUNT ? 1 : 2 },
        };
      }),
  );

export const bikesData = (bikes: Bike[]) =>
  collection(
    bikes
      .filter((b) => b.available && !b.stationId)
      .map((b) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.lon, b.lat] },
        properties: { number: b.number, ebike: b.type === "ebike" },
      })),
  );

export const routeData = (plan: TripPlan | null) =>
  collection(
    (plan?.legs ?? []).map((leg) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: leg.line.map(toLngLat) },
      properties: { mode: leg.mode },
    })),
  );

// Layer colours come from the CSS theme tokens, so a theme switch re-adds the layers (see MapView).
export function addLayers(map: MlMap) {
  const css = getComputedStyle(document.documentElement);
  const c = (name: string) => css.getPropertyValue(name).trim();
  const round = { "line-cap": "round", "line-join": "round" } as const;

  for (const id of ["route", "stations", "bikes"]) map.addSource(id, { type: "geojson", data: collection([]) });

  map.addLayer({ id: "route-casing", type: "line", source: "route", filter: ["==", ["get", "mode"], "bike"], layout: round, paint: { "line-color": c("--surface"), "line-width": 9 } });
  map.addLayer({ id: "route-bike", type: "line", source: "route", filter: ["==", ["get", "mode"], "bike"], layout: round, paint: { "line-color": c("--accent"), "line-width": 5 } });
  map.addLayer({
    id: "route-walk",
    type: "line",
    source: "route",
    filter: ["==", ["get", "mode"], "walk"],
    layout: round,
    paint: { "line-color": c("--walk"), "line-width": 3.5, "line-dasharray": [0.1, 2] },
  });
  map.addLayer({
    id: "bikes",
    type: "circle",
    source: "bikes",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 15, 5.5, 18, 8],
      "circle-color": ["case", ["get", "ebike"], c("--ebike"), c("--bike")],
      "circle-stroke-color": c("--surface"),
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 15, 1.5],
    },
  });
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 13, 5, 14.5, 11, 18, 15],
      "circle-color": c("--surface"),
      "circle-stroke-color": ["match", ["get", "level"], 0, c("--muted"), 1, c("--low"), c("--ok")],
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14.5, 3],
    },
  });
  map.addLayer({
    id: "station-counts",
    type: "symbol",
    source: "stations",
    minzoom: 14.5,
    layout: { "text-field": ["to-string", ["get", "total"]], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true },
    paint: { "text-color": c("--ink") },
  });
}
