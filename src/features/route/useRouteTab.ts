import { useMemo, useState } from "react";
import type { AppData } from "../../app/useAppData";
import type { Locate } from "../../app/useLocate";
import type { Navigation } from "../../app/useNavigation";
import { useI18n } from "../../i18n";
import type { LatLon } from "../../lib/geo";
import { stationPos } from "../../lib/planner";
import { isPhone } from "../../lib/viewport";
import type { MapMarker } from "../../map/MapView";
import { useRoutePlanner, type Field } from "./useRoutePlanner";

/** Everything behind the "Trasa" tab: the planner and picking a point on the map. */
export function useRouteTab({ all, stations }: AppData, nav: Navigation, locate: Locate, onBike: (number: string) => void) {
  const { t, lang } = useI18n();
  const [picking, setPicking] = useState<Field | null>(null);

  const planner = useRoutePlanner({
    stations,
    bikes: all.list,
    myPos: locate.pos,
    myLocationLabel: t("myLocation"),
    pointLabel: t("pointOnMap"),
    lang,
    onPlanned: (plan) => {
      nav.setSheet("half");
      nav.fit(plan.legs.flatMap((l) => l.line));
    },
  });

  const { plan, start, to } = planner;
  const pickedStart = start?.kind === "me" ? null : start; // "my location" is already the blue dot
  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (plan) m.push({ kind: "pickup", pos: plan.pickup.pos, label: "A" }, { kind: "dropoff", pos: stationPos(plan.dropoff), label: "B" });
    if (pickedStart) m.push({ kind: "from", pos: pickedStart.coords });
    if (to) m.push({ kind: "to", pos: to.coords });
    return m;
  }, [plan, pickedStart, to]);

  return {
    plan,
    picking,
    markers,
    /** Returns true when the tap was used to pick a point. */
    pickAt: (pos: LatLon) => {
      if (!picking) return false;
      planner.pickPoint(picking, pos);
      setPicking(null);
      return true;
    },
    cancelPicking: () => {
      setPicking(null);
      nav.openSheet();
    },
    panel: {
      planner,
      onBike,
      onPickOnMap: (field: Field) => {
        setPicking(field);
        nav.setSheet("peek");
      },
      onUseMyLocation: async () => {
        if (await locate.locate()) planner.choose("from", null);
      },
      onInputFocus: () => isPhone() && nav.setSheet("full"),
    },
  };
}
