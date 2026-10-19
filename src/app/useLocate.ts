import { useState } from "react";
import type { LatLon } from "../lib/geo";
import { useLocation } from "../lib/useLocation";

const HINT_MS = 5000;

/** The user's position plus a short-lived hint when they refuse or it can't be found. */
export function useLocate() {
  const location = useLocation();
  const [hint, setHint] = useState(false);

  const locate = async (): Promise<LatLon | null> => {
    const pos = location.pos ?? (await location.request());
    if (!pos) {
      setHint(true);
      setTimeout(() => setHint(false), HINT_MS);
    }
    return pos;
  };

  return { pos: location.pos, status: location.status, hint, locate };
}

export type Locate = ReturnType<typeof useLocate>;
