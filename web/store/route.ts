import { create } from "zustand";
import type { LatLon } from "@/lib/geo";
import { reverseGeocode } from "@/lib/geocode";
import type { BikePreference, TripPlan } from "@/lib/planner";
import { rememberPlace } from "@/lib/recentPlaces";

export interface PlaceValue {
  label: string;
  detail?: string;
  coords: LatLon;
  kind: "me" | "search" | "map";
}

export type Field = "from" | "to";
export type PlanStatus = "idle" | "loading" | "ready" | "noBikes" | "noDocks" | "failed";

interface RouteState {
  /** null until the user picks a start; meanwhile the start is "my location" if known. */
  from: PlaceValue | null;
  to: PlaceValue | null;
  pref: BikePreference;
  plan: TripPlan | null;
  status: PlanStatus;
  /** Inputs the current status/plan belong to, so remounting the panel doesn't re-plan. */
  plannedFor: string | null;
  picking: Field | null;
  choose: (field: Field, place: PlaceValue | null) => void;
  /** Use a tapped map point right away, then replace its label with the street address. */
  pickPoint: (field: Field, coords: LatLon, label: string, lang: string) => Promise<void>;
  swap: (start: PlaceValue | null) => void;
  setPref: (pref: BikePreference) => void;
  setPicking: (field: Field | null) => void;
  setResult: (plannedFor: string | null, status: PlanStatus, plan?: TripPlan | null) => void;
}

const remember = (p: PlaceValue) => rememberPlace({ label: p.label, detail: p.detail ?? "", coords: p.coords });

export const useRouteStore = create<RouteState>()((set, get) => ({
  from: null,
  to: null,
  pref: "any",
  plan: null,
  status: "idle",
  plannedFor: null,
  picking: null,

  choose: (field, place) => {
    if (place && place.kind !== "me") remember(place);
    set({ [field]: place });
  },

  pickPoint: async (field, coords, label, lang) => {
    set({ [field]: { label, coords, kind: "map" }, picking: null });
    const found = await reverseGeocode(coords, lang);
    if (!found || get()[field]?.coords !== coords) return;
    const named: PlaceValue = { label: found.label, detail: found.detail, coords, kind: "map" };
    remember(named);
    set({ [field]: named });
  },

  swap: (start) => set((s) => ({ from: s.to, to: start })),
  setPref: (pref) => set({ pref }),
  setPicking: (picking) => set({ picking }),
  setResult: (plannedFor, status, plan = null) => set({ plannedFor, status, plan }),
}));
