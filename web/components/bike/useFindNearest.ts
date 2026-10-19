import { useAllBikes, useStationsData } from "@/services/api";
import { findNearest } from "@/services/nearest";
import { NEARBY_IDLE, useBikeStore } from "@/store/bike";
import { useLocationStore } from "@/store/location";
import { useUi } from "@/store/ui";

const bikeStore = useBikeStore.getState;
const ui = useUi.getState;

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
