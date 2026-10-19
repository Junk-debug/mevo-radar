import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeNumber } from "@/lib/bikeNumber";
import type { NearbyPlace } from "@/lib/nearest";

export interface NearbyState {
  loading: boolean;
  places: NearbyPlace[] | null;
  error: "location" | "none" | null;
}

interface BikeState {
  /** Lower-case; mirrored in the URL hash (`#e4937`). */
  trackedNumber: string | null;
  stationId: string | null;
  nearby: NearbyState;
  setTracked: (number: string | null) => void;
  selectStation: (id: string | null) => void;
  setNearby: (nearby: NearbyState) => void;
}

export const NEARBY_IDLE: NearbyState = { loading: false, places: null, error: null };

export const numberFromHash = () => normalizeNumber(decodeURIComponent(location.hash.slice(1))) || null;

export const useBikeStore = create<BikeState>()(
  persist(
    (set) => ({
      trackedNumber: numberFromHash(),
      stationId: null,
      nearby: NEARBY_IDLE,
      setTracked: (trackedNumber) => {
        set({ trackedNumber, nearby: NEARBY_IDLE });
        history.replaceState(null, "", trackedNumber ? `#${trackedNumber}` : location.pathname);
      },
      selectStation: (stationId) => set({ stationId }),
      setNearby: (nearby) => set({ nearby }),
    }),
    {
      name: "mevo.bike",
      partialize: (s) => ({ trackedNumber: s.trackedNumber }),
      // A bike in the link wins over the one remembered from the last visit.
      merge: (saved, current) => ({ ...current, trackedNumber: current.trackedNumber ?? (saved as { trackedNumber?: string | null })?.trackedNumber ?? null }),
    },
  ),
);
