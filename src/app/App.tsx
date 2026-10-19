import { useMemo, useState } from "react";
import { useAllBikes, useStations, useSystemStats } from "../api";
import { BikePanel } from "../features/bike/BikePanel";
import { useNearby } from "../features/bike/useNearby";
import { useTracking } from "../features/bike/useTracking";
import { LivePanel } from "../features/live/LivePanel";
import { RoutePanel } from "../features/route/RoutePanel";
import { useRoutePlanner, type Field } from "../features/route/useRoutePlanner";
import { useI18n } from "../i18n";
import type { LatLon } from "../lib/geo";
import { stationPos } from "../lib/planner";
import { useLocation } from "../lib/useLocation";
import type { SheetState } from "../lib/useSheetDrag";
import { isPhone } from "../lib/viewport";
import { LocateButton } from "../map/LocateButton";
import { MapView, type CameraRequest, type MapMarker } from "../map/MapView";
import { Sheet, type Tab } from "./Sheet";
import { useTheme } from "./useTheme";

const HINT_MS = 5000;

export function App() {
  const { t, lang } = useI18n();
  const theme = useTheme();
  const stationsQuery = useStations();
  const stations = stationsQuery.data?.stations ?? [];
  const stationsById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const all = useAllBikes();
  const freeBikes = useMemo(() => all.list.filter((b) => !b.stationId), [all.list]);

  const [tab, setTab] = useState<Tab>(() => (location.hash.length > 1 ? "bike" : "route"));
  const [sheet, setSheet] = useState<SheetState>("half");
  const [camera, setCamera] = useState<CameraRequest | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [picking, setPicking] = useState<Field | null>(null);
  const [locateHint, setLocateHint] = useState(false);

  const statsQuery = useSystemStats(tab === "live");
  const userLocation = useLocation();
  const tracking = useTracking(all);

  const moveCamera = (c: Omit<CameraRequest, "key">) => setCamera({ ...c, key: Date.now() });
  const openSheet = () => setSheet((s) => (s === "peek" ? "half" : s));
  const showTab = (next: Tab) => {
    setTab(next);
    openSheet();
  };

  const locate = async (): Promise<LatLon | null> => {
    const pos = userLocation.pos ?? (await userLocation.request());
    if (!pos) {
      setLocateHint(true);
      setTimeout(() => setLocateHint(false), HINT_MS);
    }
    return pos;
  };

  const nearby = useNearby(all.list, stationsById, locate);

  const planner = useRoutePlanner({
    stations,
    bikes: all.list,
    myPos: userLocation.pos,
    myLocationLabel: t("myLocation"),
    pointLabel: t("pointOnMap"),
    lang,
    onPlanned: (plan) => {
      setSheet("half");
      moveCamera({ bounds: plan.legs.flatMap((l) => l.line) });
    },
  });

  const track = (number: string) => {
    nearby.clear();
    const bike = tracking.track(number);
    showTab("bike");
    if (bike) moveCamera({ center: [bike.lat, bike.lon], zoom: 16.5 });
  };

  const showStation = (id: string) => {
    setSelectedStationId(id);
    showTab("bike");
    const station = stationsById.get(id);
    if (station) moveCamera({ center: stationPos(station) });
  };

  const switchTab = (next: Tab) => {
    showTab(next);
    const b = tracking.bike;
    if (next === "bike" && b && !nearby.places) moveCamera({ center: [b.lat, b.lon], zoom: 16.5 });
  };

  const findNearest = async () => {
    showTab("bike");
    const found = await nearby.search();
    if (found?.places.length) moveCamera({ bounds: [found.from, ...found.places.map((p) => p.pos)] });
  };

  const startPicking = (field: Field) => {
    setPicking(field);
    setSheet("peek");
  };

  const onMapClick = (pos: LatLon) => {
    if (picking) {
      planner.pickPoint(picking, pos);
      setPicking(null);
    } else if (tab === "bike") setSelectedStationId(null);
  };

  const markers = useMemo<MapMarker[]>(() => {
    if (tab === "bike") {
      if (nearby.places?.length) return nearby.places.map((p, i) => ({ kind: "nearby" as const, pos: p.pos, label: String(i + 1) }));
      const b = tracking.bike ?? tracking.lastSeen;
      return b ? [{ kind: "bike", pos: [b.lat, b.lon], label: b.number }] : [];
    }
    if (tab !== "route") return [];
    const m: MapMarker[] = [];
    const { plan, start, to } = planner;
    if (plan) m.push({ kind: "pickup", pos: plan.pickup.pos, label: "A" }, { kind: "dropoff", pos: stationPos(plan.dropoff), label: "B" });
    if (start && start.kind !== "me") m.push({ kind: "from", pos: start.coords });
    if (to) m.push({ kind: "to", pos: to.coords });
    return m;
  }, [tab, nearby.places, tracking.bike, tracking.lastSeen, planner.plan, planner.start, planner.to]);

  const online = !stationsQuery.isError && !all.error;
  const totalBikes = stations.reduce((n, s) => n + s.bikes + s.ebikes, 0) + freeBikes.length;
  const selectedStation = selectedStationId ? (stationsById.get(selectedStationId) ?? null) : null;
  const stationBikes = useMemo(
    () =>
      all.list
        .filter((b) => b.stationId === selectedStationId)
        .sort((a, b) => Number(b.available) - Number(a.available) || (b.battery ?? -1) - (a.battery ?? -1)),
    [all.list, selectedStationId],
  );

  return (
    <div className="app">
      <MapView
        theme={theme}
        sheet={sheet}
        stations={stations}
        freeBikes={freeBikes}
        plan={tab === "route" ? planner.plan : null}
        markers={markers}
        camera={camera}
        me={userLocation.pos}
        dimStations={tab === "route" && planner.plan !== null}
        onStationClick={showStation}
        onBikeClick={track}
        onMapClick={onMapClick}
        onUserMove={() => isPhone() && !picking && setSheet("peek")}
      />

      <LocateButton
        status={userLocation.status}
        known={!!userLocation.pos}
        showHint={locateHint}
        onClick={async () => {
          const pos = await locate();
          if (pos) moveCamera({ center: pos, zoom: 16 });
        }}
      />

      {picking && (
        <div className="map-toast" role="status">
          <span>{t(picking === "from" ? "pickingStart" : "pickingDestination")}</span>
          <button
            type="button"
            onClick={() => {
              setPicking(null);
              openSheet();
            }}
          >
            {t("cancel")}
          </button>
        </div>
      )}

      <Sheet
        state={sheet}
        onState={setSheet}
        tab={tab}
        onTab={switchTab}
        online={online}
        status={stations.length ? t("stationsCount", { s: stations.length, b: totalBikes }) : "…"}
      >
        {tab === "route" && (
          <RoutePanel
            planner={planner}
            onPickOnMap={startPicking}
            onUseMyLocation={async () => {
              if (await locate()) planner.choose("from", null);
            }}
            onInputFocus={() => isPhone() && setSheet("full")}
            onBike={track}
          />
        )}
        {tab === "bike" && (
          <BikePanel
            tracked={tracking}
            nearby={nearby}
            station={selectedStation}
            stationBikes={stationBikes}
            stations={stations}
            stationsById={stationsById}
            dockedLoaded={all.dockedLoaded}
            dockedUpdated={all.dockedUpdated}
            onTrack={track}
            onUntrack={tracking.untrack}
            onFindNearest={findNearest}
            onCloseStation={() => setSelectedStationId(null)}
          />
        )}
        {tab === "live" && (
          <LivePanel stats={statsQuery.data} statsError={statsQuery.isError} stations={stations} bikes={all.list} onStation={showStation} />
        )}
      </Sheet>
    </div>
  );
}
