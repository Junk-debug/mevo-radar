import { useAllBikes, useStationsData } from "../../api";
import { findNearest } from "../../lib/nearest";
import { stationPos } from "../../lib/planner";
import { NEARBY_IDLE, useBikeStore } from "../../store/bike";
import { useLocationStore } from "../../store/location";
import { useUi } from "../../store/ui";

const bikeStore = useBikeStore.getState;
const ui = useUi.getState;

export function useTrackBike() {
  const all = useAllBikes();
  return (query: string) => {
    const key = all.resolve(query);
    bikeStore().setTracked(key);
    ui().showTab("bike");
    const bike = all.bikes.get(key);
    if (bike) ui().focusOn([bike.lat, bike.lon]);
  };
}

export function useShowStation() {
  const { byId } = useStationsData();
  return (id: string) => {
    bikeStore().selectStation(id);
    ui().showTab("bike");
    const station = byId.get(id);
    if (station) ui().focusOn(stationPos(station), 16);
  };
}

export function useFindNearest() {
  const { list } = useAllBikes();
  const { byId } = useStationsData();
  return async () => {
    ui().showTab("bike");
    bikeStore().setNearby({ ...NEARBY_IDLE, loading: true });
    const from = await useLocationStore.getState().locate();
    if (!from) return bikeStore().setNearby({ ...NEARBY_IDLE, error: "location" });
    const places = await findNearest(from, list, byId);
    bikeStore().setNearby({ loading: false, places, error: places.length ? null : "none" });
    if (places.length) ui().fit([from, ...places.map((p) => p.pos)]);
  };
}

/** The followed bike with its live data, if it is parked somewhere right now. */
export function useTrackedBike() {
  const { bikes } = useAllBikes();
  const number = useBikeStore((s) => s.tracked);
  const lastSeen = useBikeStore((s) => s.lastSeen);
  return { number, bike: number ? (bikes.get(number) ?? null) : null, lastSeen };
}

/** Opening the "Rower" tab brings the tracked bike into view. */
export function useEnterBikeTab() {
  const { bike } = useTrackedBike();
  return () => {
    if (bike && !bikeStore().nearby.places) ui().focusOn([bike.lat, bike.lon]);
  };
}
