import { useEffect, useRef } from "react";
import { useAllBikes, useStationsData } from "@/api";
import { planTrip } from "@/lib/planner";
import { useRouteStore, type PlaceValue } from "@/store/route";
import { useUi } from "@/store/ui";
import { useRouteStart } from "./useRouteStart";

const placeKey = (p: PlaceValue | null) => (p ? (p.kind === "me" ? "me" : p.coords.join()) : "");

/** Plans as soon as both ends are known, and again when they or the bike type change. */
export function useAutoPlan() {
  const start = useRouteStart();
  const to = useRouteStore((s) => s.to);
  const pref = useRouteStore((s) => s.pref);
  const { stations } = useStationsData();
  const { list } = useAllBikes();
  const key = start && to && stations.length ? `${placeKey(start)}|${placeKey(to)}|${pref}` : null;

  // Read the latest data at planning time without re-planning on every refresh or GPS update.
  const latest = useRef({ start, to, stations, list });
  latest.current = { start, to, stations, list };

  useEffect(() => {
    const { plannedFor, setResult } = useRouteStore.getState();
    if (key === plannedFor) return;
    if (!key) return setResult(null, "idle");
    const { start, to, stations, list } = latest.current;
    setResult(key, "loading");
    const isCurrent = () => useRouteStore.getState().plannedFor === key;
    planTrip(start!.coords, to!.coords, pref, stations, list)
      .then((result) => {
        if (!isCurrent()) return;
        if (typeof result === "string") return setResult(key, result);
        setResult(key, "ready", result);
        useUi.getState().setSheet("half");
        useUi.getState().fit(result.legs.flatMap((l) => l.line));
      })
      .catch(() => isCurrent() && setResult(key, "failed"));
  }, [key, pref]);
}
