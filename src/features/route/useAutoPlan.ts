import { useEffect, useRef } from "react";
import { useAllBikes, useStationsData } from "../../api";
import { planTrip } from "../../lib/planner";
import { useRouteStore, type PlaceValue } from "../../store/route";
import { useUi } from "../../store/ui";
import { useRouteStart } from "./useRouteStart";

const placeKey = (p: PlaceValue | null) => (p ? (p.kind === "me" ? "me" : p.coords.join()) : "");

/** Plans as soon as both ends are known, and again when they or the bike type change. */
export function useAutoPlan() {
  const start = useRouteStart();
  const to = useRouteStore((s) => s.to);
  const pref = useRouteStore((s) => s.pref);
  const { stations } = useStationsData();
  const { list } = useAllBikes();

  // Read the latest data at planning time without re-planning on every refresh or GPS update.
  const latest = useRef({ start, stations, list });
  latest.current = { start, stations, list };
  const request = useRef(0);
  const haveStations = stations.length > 0;

  useEffect(() => {
    const { setResult } = useRouteStore.getState();
    const { start, stations, list } = latest.current;
    if (!start || !to || !haveStations) return setResult("idle");
    const id = ++request.current;
    setResult("loading");
    planTrip(start.coords, to.coords, pref, stations, list)
      .then((result) => {
        if (id !== request.current) return;
        if (typeof result === "string") return setResult(result);
        setResult("ready", result);
        useUi.getState().setSheet("half");
        useUi.getState().fit(result.legs.flatMap((l) => l.line));
      })
      .catch(() => id === request.current && setResult("failed"));
  }, [placeKey(start), placeKey(to), pref, haveStations]);
}
