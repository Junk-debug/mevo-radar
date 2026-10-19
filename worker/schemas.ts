// Shapes of the upstream responses, limited to the fields we read. z.object strips unknown keys,
// so upstream adding fields is harmless; removing or retyping one fails loudly in parseUpstream.

import { z } from "zod";

const gbfsFeed = <T extends z.ZodType>(data: T) => z.object({ last_updated: z.number(), data });

export const stationInformationFeed = gbfsFeed(
  z.object({
    stations: z.array(
      z.object({
        station_id: z.string(),
        name: z.string(),
        address: z.string().optional(),
        lat: z.number(),
        lon: z.number(),
        capacity: z.number().optional(),
      }),
    ),
  }),
);

export const stationStatusFeed = gbfsFeed(
  z.object({
    stations: z.array(
      z.object({
        station_id: z.string(),
        num_docks_available: z.number().optional(),
        is_renting: z.boolean(),
        is_returning: z.boolean(),
        vehicle_types_available: z.array(z.object({ vehicle_type_id: z.string(), count: z.number() })).optional(),
      }),
    ),
  }),
);

export const freeBikeStatusFeed = gbfsFeed(
  z.object({
    bikes: z.array(z.object({ bike_id: z.string(), lat: z.number(), lon: z.number() })),
  }),
);

/** The fields of VEHICLE_FIELDS in mevo.ts. */
const vehicle = z.object({
  number: z.string(),
  batteryCharge: z.number().nullable(),
  currentRange: z.number().nullable(),
  category: z.string(),
  available: z.boolean(),
});
export type Vehicle = z.infer<typeof vehicle>;

export const freeFloatingVehiclesResult = z.object({
  freeFloatingVehicles: z.array(
    vehicle.extend({
      location: z.object({ location: z.object({ lat: z.number(), lng: z.number() }) }).nullish(),
    }),
  ),
});

/** Aliased `s<stationId>: dockGroupVehicles(...)` fields; null for a station the API doesn't know. */
export const dockGroupVehiclesResult = z.record(z.string(), z.array(vehicle).nullable());

export const systemStatsResult = z.object({
  systemActiveTripCount: z.object({ count: z.number() }).nullable(),
  systemStats: z.object({
    tripsToday: z.number(),
    tripsYesterday: z.number(),
    highscoreTrips: z.number(),
    tripsThisYear: z.number(),
    tripsLastYear: z.number(),
    uniqueUsersToday: z.number(),
    highscoreUniqueUsers: z.number(),
    highscoreUniqueUsersDate: z.string().nullable(),
    medianDurationToday: z.number(),
    medianDurationThisYear: z.number(),
  }),
});

const MAX_ISSUES_IN_MESSAGE = 3;

/** Validates an upstream payload; the error names the source and the failing paths for the logs. */
export function parseUpstream<T extends z.ZodType>(source: string, schema: T, payload: unknown): z.infer<T> {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  const issues = result.error.issues
    .slice(0, MAX_ISSUES_IN_MESSAGE)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  const more = result.error.issues.length > MAX_ISSUES_IN_MESSAGE ? ` (+${result.error.issues.length - MAX_ISSUES_IN_MESSAGE} more)` : "";
  throw new Error(`${source}: unexpected response shape: ${issues}${more}`);
}
