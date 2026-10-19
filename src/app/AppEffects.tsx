import { useEffect } from "react";
import { useAllBikes } from "../api";
import { useTrackBike, useTrackedBike } from "../features/bike/actions";
import { useAutoPlan } from "../features/route/useAutoPlan";
import { numberFromHash, useBikeStore } from "../store/bike";
import { useLocationStore } from "../store/location";

/** App-wide background work that isn't tied to any one panel. Renders nothing. */
export function AppEffects() {
  const all = useAllBikes();
  const { number, bike } = useTrackedBike();
  const track = useTrackBike();

  useEffect(() => useLocationStore.getState().init(), []);

  useEffect(() => {
    if (bike) useBikeStore.getState().seen(bike);
  }, [bike]);

  // A link like "#4937" can only be resolved to "e4937" once the bike data has loaded.
  useEffect(() => {
    if (!number || all.bikes.has(number)) return;
    const resolved = all.resolve(number);
    if (resolved !== number && all.bikes.has(resolved)) useBikeStore.getState().setTracked(resolved);
  }, [all.bikes, number]);

  useEffect(() => {
    const onHashChange = () => {
      const n = numberFromHash();
      if (n && n !== useBikeStore.getState().tracked) track(n);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  });

  useAutoPlan();
  return null;
}
