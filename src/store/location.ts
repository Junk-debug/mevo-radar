import { create } from "zustand";
import type { LatLon } from "../lib/geo";

export type LocationStatus = "idle" | "locating" | "ok" | "denied" | "unavailable";

interface LocationState {
  pos: LatLon | null;
  status: LocationStatus;
  hint: boolean;
  /** Start tracking silently if access was granted earlier. Returns a cleanup function. */
  init: () => () => void;
  /** The current position, asking for it if needed; shows a short hint on failure. */
  locate: () => Promise<LatLon | null>;
}

const HINT_MS = 5000;
let watchId: number | null = null;
let optedIn = false; // granted now or on an earlier visit

// Never prompts on page load: only locate() (a user tap) shows the browser prompt.
// Tracking pauses while the tab is hidden to save battery.
export const useLocationStore = create<LocationState>()((set, get) => {
  const onPosition = (p: GeolocationPosition) => set({ pos: [p.coords.latitude, p.coords.longitude], status: "ok" });
  const onError = (e: GeolocationPositionError) => {
    if (e.code === e.PERMISSION_DENIED) optedIn = false;
    set({ status: e.code === e.PERMISSION_DENIED ? "denied" : "unavailable" });
  };
  const startWatch = () => {
    if (!navigator.geolocation || watchId !== null || document.visibilityState !== "visible") return;
    watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 10_000 });
  };
  const stopWatch = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  };
  const showHint = () => {
    set({ hint: true });
    setTimeout(() => set({ hint: false }), HINT_MS);
  };

  return {
    pos: null,
    status: navigator.geolocation ? "idle" : "unavailable",
    hint: false,

    init: () => {
      navigator.permissions
        ?.query({ name: "geolocation" as PermissionName })
        .then((p) => {
          if (p.state === "granted") {
            optedIn = true;
            startWatch();
          } else if (p.state === "denied") set({ status: "denied" });
        })
        .catch(() => {});
      const onVisibility = () => (document.visibilityState === "visible" ? optedIn && startWatch() : stopWatch());
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        stopWatch();
      };
    },

    locate: () => {
      const known = get().pos;
      if (known) return Promise.resolve(known);
      if (!navigator.geolocation) {
        showHint();
        return Promise.resolve(null);
      }
      set({ status: "locating" });
      return new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (p) => {
            onPosition(p);
            optedIn = true;
            startWatch();
            resolve([p.coords.latitude, p.coords.longitude]);
          },
          (e) => {
            onError(e);
            showHint();
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
        ),
      );
    },
  };
});
