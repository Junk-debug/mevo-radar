import { useMemo } from "react";
import type { MapMarker } from "@/components/map/MapView";
import { useRouteStart } from "@/hooks/useRouteStart";
import { useTrackedBike } from "@/hooks/useTrackedBike";
import { stationPos } from "@/services/planner";
import { useBikeStore } from "@/store/bike";
import { useRouteStore } from "@/store/route";
import { useUi } from "@/store/ui";

const NONE: MapMarker[] = [];

export function useMapMarkers(): MapMarker[] {
  const tab = useUi((s) => s.tab);
  const nearby = useBikeStore((s) => s.nearby.places);
  const { bike } = useTrackedBike();
  const plan = useRouteStore((s) => s.plan);
  const to = useRouteStore((s) => s.to);
  const start = useRouteStart();
  const pickedStart = start?.kind === "me" ? null : start; // "my location" is already the blue dot

  return useMemo(() => {
    if (tab === "bike") {
      if (nearby?.length) return nearby.map((p, i) => ({ kind: "nearby", pos: p.pos, label: String(i + 1) }));
      return bike ? [{ kind: "bike", pos: [bike.lat, bike.lon], label: bike.number }] : NONE;
    }
    if (tab !== "route") return NONE;
    const m: MapMarker[] = [];
    if (plan) m.push({ kind: "pickup", pos: plan.pickup.pos, label: "A" }, { kind: "dropoff", pos: stationPos(plan.dropoff), label: "B" });
    if (pickedStart) m.push({ kind: "from", pos: pickedStart.coords });
    if (to) m.push({ kind: "to", pos: to.coords });
    return m;
  }, [tab, nearby, bike, plan, pickedStart, to]);
}
