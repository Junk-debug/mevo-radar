import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NearbyPlace } from "@/services/nearest";

export interface NearbyState {
  loading: boolean;
  places: NearbyPlace[] | null;
  error: "location" | "none" | null;
}

interface BikeState {
  /** Lower-case frame number. */
  trackedNumber: string | null;
  stationId: string | null;
  nearby: NearbyState;
  setTracked: (number: string | null) => void;
  selectStation: (id: string | null) => void;
  setNearby: (nearby: NearbyState) => void;
}

export const NEARBY_IDLE: NearbyState = { loading: false, places: null, error: null };

export const useBikeStore = create<BikeState>()(
  persist(
    (set) => ({
      trackedNumber: null,
      stationId: null,
      nearby: NEARBY_IDLE,
      setTracked: (trackedNumber) => set({ trackedNumber, nearby: NEARBY_IDLE }),
      selectStation: (stationId) => set({ stationId }),
      setNearby: (nearby) => set({ nearby }),
    }),
    { name: "mevo.bike", partialize: (s) => ({ trackedNumber: s.trackedNumber }) },
  ),
);
