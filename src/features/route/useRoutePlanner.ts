import { useEffect, useRef, useState } from "react";
import type { Bike, Station } from "../../../shared/types";
import { reverseGeocode } from "../../lib/geocode";
import type { LatLon } from "../../lib/geo";
import { planTrip, type BikePreference, type TripPlan } from "../../lib/planner";
import { rememberPlace } from "./recentPlaces";

export interface PlaceValue {
  label: string;
  detail?: string;
  coords: LatLon;
  kind: "me" | "search" | "map";
}

export type Field = "from" | "to";
export type PlanStatus = "idle" | "loading" | "ready" | "noBikes" | "noDocks" | "failed";

interface Options {
  stations: Station[];
  bikes: Bike[];
  myPos: LatLon | null;
  myLocationLabel: string;
  pointLabel: string;
  lang: string;
  onPlanned: (plan: TripPlan) => void;
}

const placeKey = (p: PlaceValue | null) => (p ? (p.kind === "me" ? "me" : p.coords.join()) : "");

export function useRoutePlanner({ stations, bikes, myPos, myLocationLabel, pointLabel, lang, onPlanned }: Options) {
  // `from` stays null until the user picks a start; meanwhile the start is "my location" if known.
  const [from, setFrom] = useState<PlaceValue | null>(null);
  const [to, setTo] = useState<PlaceValue | null>(null);
  const [pref, setPref] = useState<BikePreference>("any");
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [status, setStatus] = useState<PlanStatus>("idle");

  const start = from ?? (myPos ? { label: myLocationLabel, coords: myPos, kind: "me" as const } : null);

  // Planning reads the latest data without re-planning on every refresh or GPS update.
  const latest = useRef({ start, stations, bikes, onPlanned });
  latest.current = { start, stations, bikes, onPlanned };
  const request = useRef(0);
  const haveStations = stations.length > 0;

  useEffect(() => {
    const { start } = latest.current;
    if (!start || !to || !haveStations) {
      setPlan(null);
      setStatus("idle");
      return;
    }
    const id = ++request.current;
    setStatus("loading");
    planTrip(start.coords, to.coords, pref, latest.current.stations, latest.current.bikes)
      .then((result) => {
        if (id !== request.current) return;
        if (typeof result === "string") {
          setPlan(null);
          setStatus(result);
        } else {
          setPlan(result);
          setStatus("ready");
          latest.current.onPlanned(result);
        }
      })
      .catch(() => id === request.current && setStatus("failed"));
  }, [placeKey(start), placeKey(to), pref, haveStations]);

  const choose = (field: Field, place: PlaceValue | null) => {
    if (place && place.kind !== "me") rememberPlace({ label: place.label, detail: place.detail ?? "", coords: place.coords });
    (field === "from" ? setFrom : setTo)(place);
  };

  /** Use a tapped map point right away, then replace its label with the street address. */
  const pickPoint = async (field: Field, coords: LatLon) => {
    const place: PlaceValue = { label: pointLabel, coords, kind: "map" };
    (field === "from" ? setFrom : setTo)(place);
    const found = await reverseGeocode(coords, lang);
    if (!found) return;
    const named: PlaceValue = { ...place, label: found.label, detail: found.detail };
    rememberPlace({ label: named.label, detail: named.detail ?? "", coords });
    (field === "from" ? setFrom : setTo)((current) => (current?.coords === coords ? named : current));
  };

  const swap = () => {
    setFrom(to);
    setTo(start);
  };

  return { start, isDefaultStart: !from && !!start, to, pref, plan, status, choose, pickPoint, setPref, swap };
}

export type RoutePlanner = ReturnType<typeof useRoutePlanner>;
