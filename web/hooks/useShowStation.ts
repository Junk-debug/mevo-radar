import { useStationsData } from "@/services/api";
import { stationPos } from "@/services/planner";
import { useBikeStore } from "@/store/bike";
import { useUi } from "@/store/ui";

const bikeStore = useBikeStore.getState;
const ui = useUi.getState;

export function useShowStation() {
  const { byId } = useStationsData();
  return (id: string) => {
    bikeStore().selectStation(id);
    ui().showTab("bike");
    const station = byId.get(id);
    if (station) ui().focusOn(stationPos(station), 16);
  };
}
