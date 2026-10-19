import { useAllBikes, useStationsData } from "@/api";
import { findNearest } from "@/lib/nearest";
import { stationPos } from "@/lib/planner";
import { NEARBY_IDLE, useBikeStore } from "@/store/bike";
import { useLocationStore } from "@/store/location";
import { useUi } from "@/store/ui";

const bikeStore = useBikeStore.getState;
const ui = useUi.getState;

export function useTrackBike() {
  const { resolve } = useAllBikes();
  return (query: string) => {
    bikeStore().setTracked(resolve(query));
    ui().showTab("bike");
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

/**
 * The followed bike with its live data, if it is parked somewhere right now. A link may carry a
 * loose number ("#4937"), so it is resolved against the data on every read.
 */
export function useTrackedBike() {
  const { bikes, resolve } = useAllBikes();
  const number = useBikeStore((s) => s.tracked);
  return { number, bike: number ? (bikes.get(number) ?? bikes.get(resolve(number)) ?? null) : null };
}
