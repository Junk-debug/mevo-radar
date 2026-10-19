// Shapes returned by the Worker's /api/* routes and consumed by the web app.

export type BikeType = "bike" | "ebike";

export type Meters = number;
export type Seconds = number;
export type UnixSeconds = number;
export type Percent = number;

export interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  capacity: number;
  classicBikes: number;
  ebikes: number;
  freeDocks: number;
  active: boolean;
}

export interface Bike {
  number: string; // as printed on the frame, e.g. "e4937" or "0366"
  type: BikeType;
  available: boolean;
  battery: Percent | null; // e-bikes only
  range: Meters | null;
  lat: number;
  lon: number;
  stationId: string | null; // null = parked outside a station
  appId: string | null; // GBFS bike id used by the MEVO app deep link (rowermevo://vehicles/<id>); outside stations only
}

export interface StationsResponse {
  updated: UnixSeconds;
  stations: Station[];
}

export interface BikesResponse {
  updated: UnixSeconds;
  bikes: Bike[];
}

/** System-wide numbers, the same ones rowermevo.pl shows on its live page. */
export interface SystemStats {
  updated: UnixSeconds;
  activeTrips: number;
  tripsToday: number;
  tripsYesterday: number;
  tripsThisYear: number;
  tripsLastYear: number;
  uniqueUsersToday: number;
  recordTrips: number;
  recordUsers: number;
  recordUsersDate: string | null; // YYYY-MM-DD
  medianDurationToday: Seconds;
  medianDurationThisYear: Seconds;
}
