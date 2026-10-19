import { create } from "zustand";
import type { LatLon } from "../lib/geo";

export type Tab = "route" | "bike" | "live";
/** Phone bottom sheet height. On desktop only "peek" (hidden) vs anything else (shown) matters. */
export type SheetState = "peek" | "half" | "full";

export interface CameraRequest {
  key: number; // a new key re-runs an otherwise identical request
  center?: LatLon;
  zoom?: number;
  bounds?: LatLon[];
}

interface UiState {
  tab: Tab;
  sheet: SheetState;
  camera: CameraRequest | null;
  showTab: (tab: Tab) => void;
  setSheet: (sheet: SheetState) => void;
  openSheet: () => void;
  focusOn: (center: LatLon, zoom?: number) => void;
  fit: (bounds: LatLon[]) => void;
}

const opened = (s: SheetState): SheetState => (s === "peek" ? "half" : s);

export const useUi = create<UiState>()((set) => ({
  tab: location.hash.length > 1 ? "bike" : "route",
  sheet: "half",
  camera: null,
  showTab: (tab) => set((s) => ({ tab, sheet: opened(s.sheet) })),
  setSheet: (sheet) => set({ sheet }),
  openSheet: () => set((s) => ({ sheet: opened(s.sheet) })),
  focusOn: (center, zoom = 16.5) => set({ camera: { key: Date.now(), center, zoom } }),
  fit: (bounds) => set({ camera: { key: Date.now(), bounds } }),
}));
