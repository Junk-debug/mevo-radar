import { useState } from "react";
import type { Bike, Station } from "../../../shared/types";
import type { LatLon } from "../../lib/geo";
import { findNearest, type NearbyPlace } from "../../lib/nearest";

export interface NearbyState {
  loading: boolean;
  places: NearbyPlace[] | null;
  error: "location" | "none" | null;
}

const IDLE: NearbyState = { loading: false, places: null, error: null };

export function useNearby(bikes: Bike[], stationsById: Map<string, Station>, locate: () => Promise<LatLon | null>) {
  const [state, setState] = useState<NearbyState>(IDLE);

  const search = async (): Promise<{ from: LatLon; places: NearbyPlace[] } | null> => {
    setState({ loading: true, places: null, error: null });
    const from = await locate();
    if (!from) {
      setState({ loading: false, places: null, error: "location" });
      return null;
    }
    const places = await findNearest(from, bikes, stationsById);
    setState({ loading: false, places, error: places.length ? null : "none" });
    return { from, places };
  };

  return { ...state, search, clear: () => setState(IDLE) };
}
