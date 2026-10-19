import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Bike } from "../../shared/types";
import { normalizeNumber } from "../lib/bikeNumber";
import type { NearbyPlace } from "../lib/nearest";

export interface NearbyState {
  loading: boolean;
  places: NearbyPlace[] | null;
  error: "location" | "none" | null;
}

interface BikeState {
  /** Lower-case frame number of the followed bike; mirrored in the URL hash (`#e4937`). */
  tracked: string | null;
  /** Last known state of the tracked bike, kept while it is out on a trip. */
  lastSeen: Bike | null;
  stationId: string | null;
  nearby: NearbyState;
  setTracked: (number: string | null) => void;
  seen: (bike: Bike) => void;
  selectStation: (id: string | null) => void;
  setNearby: (nearby: NearbyState) => void;
}

export const NEARBY_IDLE: NearbyState = { loading: false, places: null, error: null };

export const numberFromHash = () => normalizeNumber(decodeURIComponent(location.hash.slice(1))) || null;

export const useBikeStore = create<BikeState>()(
  persist(
    (set) => ({
      tracked: numberFromHash(),
      lastSeen: null,
      stationId: null,
      nearby: NEARBY_IDLE,
      setTracked: (tracked) => {
        set({ tracked, lastSeen: null, nearby: NEARBY_IDLE });
        history.replaceState(null, "", tracked ? `#${tracked}` : location.pathname);
      },
      seen: (lastSeen) => set({ lastSeen }),
      selectStation: (stationId) => set({ stationId }),
      setNearby: (nearby) => set({ nearby }),
    }),
    {
      name: "mevo.bike",
      partialize: (s) => ({ tracked: s.tracked }),
      // A bike in the link wins over the one remembered from the last visit.
      merge: (saved, current) => ({ ...current, tracked: current.tracked ?? (saved as { tracked?: string | null })?.tracked ?? null }),
    },
  ),
);
