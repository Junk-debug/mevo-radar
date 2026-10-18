import { LngLatBounds, Map as MlMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type LngLatLike, type MapMouseEvent } from "maplibre-gl";
// MapLibre locates its worker relative to its own bundle at runtime, which Vite can't see; bundle it explicitly.
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Bike, Station } from "../../shared/types";
import { TRICITY_CENTER, type LatLon } from "../lib/geo";
import { LOW_COUNT, type TripPlan } from "../lib/planner";

setWorkerUrl(mapWorkerUrl);

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

export type MarkerKind = "from" | "to" | "pickup" | "dropoff" | "bike" | "nearby";
export interface MapMarker {
  kind: MarkerKind;
  pos: LatLon;
  label?: string;
}

export interface CameraRequest {
  key: number; // bump to re-run the same request
  center?: LatLon;
  zoom?: number;
  bounds?: LatLon[];
}

interface Props {
  theme: "light" | "dark";
  stations: Station[];
  freeBikes: Bike[];
  plan: TripPlan | null;
  markers: MapMarker[];
  camera: CameraRequest | null;
  /** The user's position ("you are here" dot), or null when unknown. */
  me: LatLon | null;
  dimStations: boolean;
  onStationClick: (id: string) => void;
  onBikeClick: (number: string) => void;
  onMapClick: (pos: LatLon) => void;
  /** The user started panning/zooming the map themselves (not a programmatic camera move). */
  onUserMove: () => void;
}

const ll = ([lat, lon]: LatLon): [number, number] => [lon, lat];
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function stationsGeoJSON(stations: Station[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations
      .filter((s) => s.active)
      .map((s) => {
        const total = s.bikes + s.ebikes;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          properties: { id: s.id, total, level: total === 0 ? 0 : total <= LOW_COUNT ? 1 : 2 },
        };
      }),
  };
}

function bikesGeoJSON(bikes: Bike[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: bikes
      .filter((b) => b.available && !b.stationId)
      .map((b) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.lon, b.lat] },
        properties: { number: b.number, ebike: b.type === "ebike" },
      })),
  };
}

function routeGeoJSON(plan: TripPlan | null): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: (plan?.legs ?? []).map((leg) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: leg.line.map(ll) },
      properties: { mode: leg.mode },
    })),
  };
}

function addAppLayers(map: MlMap) {
  const c = {
    surface: cssVar("--surface"),
    ink: cssVar("--ink"),
    ok: cssVar("--ok"),
    low: cssVar("--low"),
    empty: cssVar("--muted"),
    ebike: cssVar("--ebike"),
    bike: cssVar("--bike"),
    route: cssVar("--accent"),
    walk: cssVar("--walk"),
  };
  const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
  map.addSource("route", { type: "geojson", data: empty });
  map.addSource("stations", { type: "geojson", data: empty });
  map.addSource("bikes", { type: "geojson", data: empty });

  map.addLayer({
    id: "route-casing",
    type: "line",
    source: "route",
    filter: ["==", ["get", "mode"], "bike"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": c.surface, "line-width": 9 },
  });
  map.addLayer({
    id: "route-bike",
    type: "line",
    source: "route",
    filter: ["==", ["get", "mode"], "bike"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": c.route, "line-width": 5 },
  });
  map.addLayer({
    id: "route-walk",
    type: "line",
    source: "route",
    filter: ["==", ["get", "mode"], "walk"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": c.walk, "line-width": 3.5, "line-dasharray": [0.1, 2] },
  });
  map.addLayer({
    id: "bikes",
    type: "circle",
    source: "bikes",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 15, 5.5, 18, 8],
      "circle-color": ["case", ["get", "ebike"], c.ebike, c.bike],
      "circle-stroke-color": c.surface,
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 15, 1.5],
    },
  });
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 13, 5, 14.5, 11, 18, 15],
      "circle-color": c.surface,
      "circle-stroke-color": ["match", ["get", "level"], 0, c.empty, 1, c.low, c.ok],
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14.5, 3],
    },
  });
  map.addLayer({
    id: "station-counts",
    type: "symbol",
    source: "stations",
    minzoom: 14.5,
    layout: {
      "text-field": ["to-string", ["get", "total"]],
      "text-font": ["Noto Sans Bold"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": c.ink },
  });
}

function markerElement(m: MapMarker): HTMLElement {
  const el = document.createElement("div");
  el.className = `mk mk-${m.kind}`;
  if (m.label) {
    const span = document.createElement("span");
    span.textContent = m.label;
    el.appendChild(span);
  }
  return el;
}

export function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const meMarker = useRef<Marker | null>(null);
  const latest = useRef(props);
  latest.current = props;

  const pushData = () => {
    const map = mapRef.current;
    const p = latest.current;
    if (!map?.getSource("stations")) return;
    (map.getSource("stations") as GeoJSONSource).setData(stationsGeoJSON(p.stations));
    (map.getSource("bikes") as GeoJSONSource).setData(bikesGeoJSON(p.freeBikes));
    (map.getSource("route") as GeoJSONSource).setData(routeGeoJSON(p.plan));
    const dim = p.dimStations ? 0.35 : 1;
    map.setPaintProperty("stations", "circle-opacity", dim);
    map.setPaintProperty("stations", "circle-stroke-opacity", dim);
    map.setPaintProperty("bikes", "circle-opacity", dim);
  };

  // Create the map once.
  useEffect(() => {
    const map = new MlMap({
      container: container.current!,
      style: STYLES[latest.current.theme],
      center: ll(TRICITY_CENTER) as LngLatLike,
      zoom: 11,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("style.load", () => {
      addAppLayers(map);
      pushData();
    });
    for (const layer of ["stations", "bikes"]) {
      map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
    }
    map.on("dragstart", () => latest.current.onUserMove());
    map.on("zoomstart", (e) => {
      if ((e as { originalEvent?: Event }).originalEvent) latest.current.onUserMove();
    });
    map.on("click", (e: MapMouseEvent) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ["bikes", "stations"] })[0];
      if (hit?.layer.id === "bikes") latest.current.onBikeClick(String(hit.properties.number));
      else if (hit?.layer.id === "stations") latest.current.onStationClick(String(hit.properties.id));
      else latest.current.onMapClick([e.lngLat.lat, e.lngLat.lng]);
    });
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setStyle(STYLES[props.theme], { diff: false });
  }, [props.theme]);

  useEffect(pushData, [props.stations, props.freeBikes, props.plan, props.dimStations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = props.markers.map((m) =>
      new Marker({ element: markerElement(m), anchor: m.kind === "bike" || m.kind === "to" ? "bottom" : "center" })
        .setLngLat(ll(m.pos))
        .addTo(map),
    );
  }, [props.markers]);

  // One persistent marker that just moves, so GPS updates don't rebuild the other markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!props.me) {
      meMarker.current?.remove();
      meMarker.current = null;
      return;
    }
    if (!meMarker.current) {
      const el = document.createElement("div");
      el.className = "mk-me";
      meMarker.current = new Marker({ element: el }).setLngLat(ll(props.me)).addTo(map);
    } else meMarker.current.setLngLat(ll(props.me));
  }, [props.me]);

  useEffect(() => {
    const map = mapRef.current;
    const cam = props.camera;
    if (!map || !cam) return;
    // Keep the target out from under the panel, whatever state it is in. Read the layout box
    // (offset*, not getBoundingClientRect) so an in-progress open/close transition doesn't skew it.
    const sheet = document.querySelector<HTMLElement>(".sheet");
    const open = sheet && !sheet.classList.contains("collapsed");
    const padding = window.innerWidth >= 900
      ? { top: 60, bottom: 60, left: open ? sheet.offsetLeft + sheet.offsetWidth + 40 : 60, right: 60 }
      : { top: 60, bottom: (open ? window.innerHeight * 0.64 : 130) + 20, left: 40, right: 40 };
    if (cam.bounds?.length) {
      const b = new LngLatBounds();
      cam.bounds.forEach((p) => b.extend(ll(p)));
      map.fitBounds(b, { padding, maxZoom: 16, duration: 700 });
    } else if (cam.center) {
      map.easeTo({ center: ll(cam.center), zoom: cam.zoom ?? Math.max(map.getZoom(), 16), padding, duration: 700 });
    }
  }, [props.camera]);

  return <div ref={container} className="map" />;
}
