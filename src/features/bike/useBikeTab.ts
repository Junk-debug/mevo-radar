import { useMemo, useState } from "react";
import type { AppData } from "../../app/useAppData";
import type { Locate } from "../../app/useLocate";
import type { Navigation } from "../../app/useNavigation";
import { stationPos } from "../../lib/planner";
import type { MapMarker } from "../../map/MapView";
import { useNearby } from "./useNearby";
import { useTracking } from "./useTracking";

/** Everything behind the "Rower" tab: the tracked bike, nearby bikes and the selected station. */
export function useBikeTab({ all, stations, stationsById }: AppData, nav: Navigation, { locate }: Locate) {
  const tracking = useTracking(all);
  const nearby = useNearby(all.list, stationsById, locate);
  const [stationId, setStationId] = useState<string | null>(null);

  const stationBikes = useMemo(
    () =>
      all.list
        .filter((b) => b.stationId === stationId)
        .sort((a, b) => Number(b.available) - Number(a.available) || (b.battery ?? -1) - (a.battery ?? -1)),
    [all.list, stationId],
  );

  const track = (number: string) => {
    nearby.clear();
    const bike = tracking.track(number);
    nav.showTab("bike");
    if (bike) nav.focusOn([bike.lat, bike.lon]);
  };

  const showStation = (id: string) => {
    setStationId(id);
    nav.showTab("bike");
    const station = stationsById.get(id);
    if (station) nav.focusOn(stationPos(station), 16);
  };

  const findNearest = async () => {
    nav.showTab("bike");
    const found = await nearby.search();
    if (found?.places.length) nav.fit([found.from, ...found.places.map((p) => p.pos)]);
  };

  /** Opening the tab brings the tracked bike into view. */
  const enter = () => {
    const b = tracking.bike;
    if (b && !nearby.places) nav.focusOn([b.lat, b.lon]);
  };

  const shown = tracking.bike ?? tracking.lastSeen;
  const markers = useMemo<MapMarker[]>(() => {
    if (nearby.places?.length) return nearby.places.map((p, i) => ({ kind: "nearby", pos: p.pos, label: String(i + 1) }));
    return shown ? [{ kind: "bike", pos: [shown.lat, shown.lon], label: shown.number }] : [];
  }, [nearby.places, shown]);

  return {
    track,
    showStation,
    enter,
    deselect: () => setStationId(null),
    markers,
    panel: {
      tracked: tracking,
      nearby,
      station: stationId ? (stationsById.get(stationId) ?? null) : null,
      stationBikes,
      stations,
      stationsById,
      dockedLoaded: all.dockedLoaded,
      dockedUpdated: all.dockedUpdated,
      onTrack: track,
      onUntrack: tracking.untrack,
      onFindNearest: findNearest,
      onCloseStation: () => setStationId(null),
    },
  };
}
