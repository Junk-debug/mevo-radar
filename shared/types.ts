// Shapes returned by the Worker's /api/* routes and consumed by the web app.

export type BikeType = "bike" | "ebike";

export interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  capacity: number;
  bikes: number; // regular bikes available
  ebikes: number; // e-bikes available
  docks: number; // free parking spots
  active: boolean;
}

export interface Bike {
  number: string; // as printed on the frame, e.g. "e4937" or "0366"
  type: BikeType;
  available: boolean;
  battery: number | null; // percent, e-bikes only
  range: number | null; // metres
  lat: number;
  lon: number;
  stationId: string | null; // null = parked outside a station
  appId: string | null; // GBFS bike id used by the MEVO app deep link (rowermevo://vehicles/<id>); outside stations only
}

export interface StationsResponse {
  updated: number; // unix seconds
  stations: Station[];
}

export interface BikesResponse {
  updated: number;
  bikes: Bike[];
}

/** System-wide numbers, the same ones rowermevo.pl shows on its live page. */
export interface SystemStats {
  updated: number;
  activeTrips: number;
  tripsToday: number;
  tripsYesterday: number;
  tripsThisYear: number;
  tripsLastYear: number;
  uniqueUsersToday: number;
  recordTrips: number;
  recordUsers: number;
  recordUsersDate: string | null; // YYYY-MM-DD
  medianDurationToday: number; // seconds
  medianDurationThisYear: number; // seconds
}
