import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLon } from "./geo";

export type LocationStatus = "idle" | "locating" | "ok" | "denied" | "unavailable";

export interface UserLocation {
  pos: LatLon | null;
  accuracy: number | null; // metres
  status: LocationStatus;
  /** Ask for the position (shows the browser prompt the first time). Resolves with the position or null. */
  request: () => Promise<LatLon | null>;
}

/**
 * The user's position, without nagging: nothing is asked on page load. If the user already
 * granted access earlier, tracking starts silently; otherwise only an explicit action (`request`)
 * triggers the browser prompt. Tracking pauses while the tab is hidden to save battery.
 */
export function useLocation(): UserLocation {
  const [pos, setPos] = useState<LatLon | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationStatus>(navigator.geolocation ? "idle" : "unavailable");
  const watchId = useRef<number | null>(null);
  const wanted = useRef(false); // the user has opted in during this visit (or earlier, via a granted permission)

  const onPosition = useCallback((p: GeolocationPosition) => {
    setPos([p.coords.latitude, p.coords.longitude]);
    setAccuracy(p.coords.accuracy);
    setStatus("ok");
  }, []);

  const onError = useCallback((e: GeolocationPositionError) => {
    setStatus(e.code === e.PERMISSION_DENIED ? "denied" : "unavailable");
    if (e.code === e.PERMISSION_DENIED) wanted.current = false;
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation || watchId.current !== null || document.visibilityState !== "visible") return;
    watchId.current = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 10_000 });
  }, [onPosition, onError]);

  const stopWatch = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  };

  // Already granted on an earlier visit → show the dot without asking.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (p.state === "granted") {
          wanted.current = true;
          startWatch();
        } else if (p.state === "denied") setStatus("denied");
      })
      .catch(() => {});
    const onVisibility = () => (document.visibilityState === "visible" ? wanted.current && startWatch() : stopWatch());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopWatch();
    };
  }, [startWatch]);

  const request = useCallback(
    () =>
      new Promise<LatLon | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        setStatus((s) => (s === "ok" ? s : "locating"));
        navigator.geolocation.getCurrentPosition(
          (p) => {
            onPosition(p);
            wanted.current = true;
            startWatch();
            resolve([p.coords.latitude, p.coords.longitude]);
          },
          (e) => {
            onError(e);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
        );
      }),
    [onPosition, onError, startWatch],
  );

  return { pos, accuracy, status, request };
}
