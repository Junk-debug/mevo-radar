// Serves the built web app and /api/*. Bikes at stations take ~22 upstream requests to list, so
// the DockedBikes Durable Object (docked.ts) keeps that list fresh on its own alarm loop and
// /api/docked only reads it; a short edge cache in front keeps most visitors off the object.

import type { BikesResponse, StationBikesResponse, StationsResponse } from "../shared/types";
import { DockedBikes } from "./docked";
import { errorMessage, fetchFreeBikes, fetchStationBikes, fetchStations, fetchSystemStats } from "./mevo";

export { DockedBikes };

interface Env {
  DOCKED: DurableObjectNamespace<DockedBikes>;
  ASSETS: Fetcher;
}

const DOCKED_MAX_AGE_SECONDS = 15; // the object rescans every 30 s
const STATION_BIKES_MAX_AGE_SECONDS = 10;
const STATION_BIKES_PATH = /^\/api\/stations\/([^/]+)\/bikes$/;
const now = () => Math.floor(Date.now() / 1000);

class NotFound extends Error {}

function json(body: unknown, maxAge: number, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": `public, max-age=${maxAge}` },
  });
}

// Edge-cache an upstream call so many visitors share one upstream request.
async function cached(request: Request, ctx: ExecutionContext, maxAge: number, load: () => Promise<unknown>) {
  const cache = caches.default;
  const key = new Request(new URL(request.url).toString(), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = json(await load(), maxAge);
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

// Frame numbers are the bikes' identity in the web app, so without GraphQL there is nothing
// correct to show: answer an empty, flagged list instead of an error or GBFS bikes with fake numbers.
async function loadFreeBikes(): Promise<BikesResponse> {
  try {
    return { updated: now(), bikes: await fetchFreeBikes() };
  } catch (e) {
    console.error(`Free bikes degraded to an empty list: ${errorMessage(e)}`);
    return { updated: now(), bikes: [], degraded: true };
  }
}

async function api(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { pathname } = new URL(request.url);
  const stationBikes = STATION_BIKES_PATH.exec(pathname);
  if (stationBikes) {
    const id = decodeURIComponent(stationBikes[1]);
    return cached(request, ctx, STATION_BIKES_MAX_AGE_SECONDS, async (): Promise<StationBikesResponse> => {
      const bikes = await fetchStationBikes(id);
      if (!bikes) throw new NotFound(`Unknown station ${id}`);
      return { stationId: id, updated: now(), bikes };
    });
  }
  switch (pathname) {
    case "/api/stations":
      return cached(request, ctx, 20, async (): Promise<StationsResponse> => fetchStations());
    case "/api/bikes":
      return cached(request, ctx, 15, loadFreeBikes);
    case "/api/stats":
      return cached(request, ctx, 30, fetchSystemStats);
    case "/api/docked":
      return cached(request, ctx, DOCKED_MAX_AGE_SECONDS, () => env.DOCKED.getByName("docked").list());
    default:
      return json({ error: "Not found" }, 0, 404);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (!new URL(request.url).pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, ctx);
    } catch (e) {
      if (e instanceof NotFound) return json({ error: e.message }, 0, 404);
      console.error(`${new URL(request.url).pathname}: ${errorMessage(e)}`);
      return json({ error: errorMessage(e) }, 0, 502);
    }
  },
} satisfies ExportedHandler<Env>;
