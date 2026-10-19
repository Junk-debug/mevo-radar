import { LngLatBounds, Map as MlMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent } from "maplibre-gl";
// MapLibre resolves its web worker relative to its own bundle at runtime, which Vite can't
// follow; bundle the worker explicitly (see also optimizeDeps in vite.config.ts).
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Bike, Station } from "../../shared/types";
import { TRICITY_CENTER, type LatLon } from "../lib/geo";
import type { TripPlan } from "../lib/planner";
import type { SheetState } from "../lib/useSheetDrag";
import { isPhone } from "../lib/viewport";
import { addLayers, bikesData, routeData, stationsData, toLngLat } from "./layers";
import "./map.css";

setWorkerUrl(mapWorkerUrl);

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
const DESKTOP_PANEL_EDGE = 16 + 412 + 40; // panel offset + width + breathing room
const PHONE_HALF_SHEET = 0.64; // matches .sheet max-height on phones
const PHONE_PEEK_SHEET = 150;

export type MarkerKind = "from" | "to" | "pickup" | "dropoff" | "bike" | "nearby";
export interface MapMarker {
  kind: MarkerKind;
  pos: LatLon;
  label?: string;
}

export interface CameraRequest {
  key: number; // a new key re-runs an otherwise identical request
  center?: LatLon;
  zoom?: number;
  bounds?: LatLon[];
}

interface Props {
  theme: "light" | "dark";
  sheet: SheetState;
  stations: Station[];
  freeBikes: Bike[];
  plan: TripPlan | null;
  markers: MapMarker[];
  camera: CameraRequest | null;
  me: LatLon | null;
  dimStations: boolean;
  onStationClick: (id: string) => void;
  onBikeClick: (number: string) => void;
  onMapClick: (pos: LatLon) => void;
  /** Pan/zoom started by the user, not by a camera request. */
  onUserMove: () => void;
}

function markerElement(m: MapMarker) {
  const el = document.createElement("div");
  el.className = `mk mk-${m.kind}`;
  if (m.label) el.append(Object.assign(document.createElement("span"), { textContent: m.label }));
  return el;
}

/** Keep camera targets clear of the panel, whatever state it is in. */
function cameraPadding(sheet: SheetState) {
  const open = sheet !== "peek";
  if (!isPhone()) return { top: 60, bottom: 60, right: 60, left: open ? DESKTOP_PANEL_EDGE : 60 };
  const covered = open ? window.innerHeight * PHONE_HALF_SHEET : PHONE_PEEK_SHEET;
  return { top: 60, bottom: covered + 20, left: 40, right: 40 };
}

export function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const meMarker = useRef<Marker | null>(null);
  const latest = useRef(props);
  latest.current = props;

  const pushData = () => {
    const map = mapRef.current;
    const p = latest.current;
    if (!map?.getSource("stations")) return;
    (map.getSource("stations") as GeoJSONSource).setData(stationsData(p.stations));
    (map.getSource("bikes") as GeoJSONSource).setData(bikesData(p.freeBikes));
    (map.getSource("route") as GeoJSONSource).setData(routeData(p.plan));
    const opacity = p.dimStations ? 0.35 : 1;
    map.setPaintProperty("stations", "circle-opacity", opacity);
    map.setPaintProperty("stations", "circle-stroke-opacity", opacity);
    map.setPaintProperty("bikes", "circle-opacity", opacity);
  };

  useEffect(() => {
    const map = new MlMap({
      container: container.current!,
      style: STYLES[latest.current.theme],
      center: toLngLat(TRICITY_CENTER),
      zoom: 11,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("style.load", () => {
      addLayers(map);
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
  }, []);

  useEffect(() => {
    mapRef.current?.setStyle(STYLES[props.theme], { diff: false });
  }, [props.theme]);

  useEffect(pushData, [props.stations, props.freeBikes, props.plan, props.dimStations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m) => m.remove());
    markers.current = props.markers.map((m) =>
      new Marker({ element: markerElement(m), anchor: m.kind === "bike" || m.kind === "to" ? "bottom" : "center" })
        .setLngLat(toLngLat(m.pos))
        .addTo(map),
    );
  }, [props.markers]);

  // A separate marker that only moves, so GPS updates don't rebuild the others.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!props.me) {
      meMarker.current?.remove();
      meMarker.current = null;
    } else if (meMarker.current) {
      meMarker.current.setLngLat(toLngLat(props.me));
    } else {
      const el = Object.assign(document.createElement("div"), { className: "mk-me" });
      meMarker.current = new Marker({ element: el }).setLngLat(toLngLat(props.me)).addTo(map);
    }
  }, [props.me]);

  useEffect(() => {
    const map = mapRef.current;
    const cam = props.camera;
    if (!map || !cam) return;
    const padding = cameraPadding(latest.current.sheet);
    if (cam.bounds?.length) {
      const bounds = new LngLatBounds();
      cam.bounds.forEach((p) => bounds.extend(toLngLat(p)));
      map.fitBounds(bounds, { padding, maxZoom: 16, duration: 700 });
    } else if (cam.center) {
      map.easeTo({ center: toLngLat(cam.center), zoom: cam.zoom ?? Math.max(map.getZoom(), 16), padding, duration: 700 });
    }
  }, [props.camera]);

  return <div ref={container} className="map" />;
}
