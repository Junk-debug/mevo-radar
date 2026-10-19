import { useAllBikes } from "@/services/api";
import { useBikeStore } from "@/store/bike";

/**
 * The followed bike with its live data, if it is parked somewhere right now. A link may carry a
 * loose number ("#4937"), so it is resolved against the data on every read.
 */
export function useTrackedBike() {
  const { bikes, resolve } = useAllBikes();
  const number = useBikeStore((s) => s.trackedNumber);
  return { number, bike: number ? (bikes.get(number) ?? bikes.get(resolve(number)) ?? null) : null };
}
