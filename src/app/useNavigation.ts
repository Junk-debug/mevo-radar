import { useState } from "react";
import type { LatLon } from "../lib/geo";
import type { SheetState } from "../lib/useSheetDrag";
import type { CameraRequest } from "../map/MapView";
import type { Tab } from "./Sheet";

/** Which tab is open, how far the panel is pulled out, and where the map should look. */
export function useNavigation() {
  const [tab, setTab] = useState<Tab>(() => (location.hash.length > 1 ? "bike" : "route"));
  const [sheet, setSheet] = useState<SheetState>("half");
  const [camera, setCamera] = useState<CameraRequest | null>(null);

  const openSheet = () => setSheet((s) => (s === "peek" ? "half" : s));

  return {
    tab,
    sheet,
    camera,
    setSheet,
    openSheet,
    showTab: (next: Tab) => {
      setTab(next);
      openSheet();
    },
    focusOn: (center: LatLon, zoom = 16.5) => setCamera({ key: Date.now(), center, zoom }),
    fit: (bounds: LatLon[]) => setCamera({ key: Date.now(), bounds }),
  };
}

export type Navigation = ReturnType<typeof useNavigation>;
