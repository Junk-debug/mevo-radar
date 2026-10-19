import { useAllBikes } from "@/services/api";
import { useBikeStore } from "@/store/bike";
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
