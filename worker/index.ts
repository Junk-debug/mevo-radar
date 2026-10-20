// Serves the built web app and /api/*. Bikes at stations take ~20 upstream requests to list,
// so a cron scans them every 5 minutes into KV instead of per visitor. The free plan allows
// 1000 KV writes a day; a scan is one write, so every 5 minutes (288/day) leaves room for
// on-demand rescans and stays under Cloudflare's 50 % usage alert.

import type { BikesResponse, StationsResponse } from "../shared/types";
import { errorMessage, fetchDockedBikes, fetchFreeBikes, fetchStations, fetchSystemStats } from "./mevo";

interface Env {
  MEVO_KV: KVNamespace;
  ASSETS: Fetcher;
}

const DOCKED_KEY = "docked-bikes";
const DOCKED_STALE_AFTER_SECONDS = 330; // the cron refreshes every 300 s; rescan on demand if it lagged
const MIN_SECONDS_BETWEEN_SCANS = 120;
const DOCKED_MAX_AGE_SECONDS = 30;
let lastScanStartedAt = 0; // per isolate: stops concurrent requests from starting parallel scans
const now = () => Math.floor(Date.now() / 1000);

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

async function scanDocked(env: Env): Promise<BikesResponse> {
  lastScanStartedAt = now();
  const body: BikesResponse = { updated: now(), bikes: await fetchDockedBikes() };
  await env.MEVO_KV.put(DOCKED_KEY, JSON.stringify(body), { metadata: { updated: body.updated } });
  return body;
}

function scanDockedLoggingFailure(env: Env, trigger: string): Promise<BikesResponse> {
  return scanDocked(env).catch((e: unknown) => {
    console.error(`Docked scan (${trigger}) failed, keeping the previous KV data: ${errorMessage(e)}`);
    throw e;
  });
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
  switch (pathname) {
    case "/api/stations":
      return cached(request, ctx, 20, async (): Promise<StationsResponse> => fetchStations());
    case "/api/bikes":
      return cached(request, ctx, 15, loadFreeBikes);
    case "/api/stats":
      return cached(request, ctx, 30, fetchSystemStats);
    case "/api/docked": {
      const key = new Request(new URL(request.url).toString(), { method: "GET" });
      const hit = await caches.default.match(key);
      if (hit) return hit;
      const { value: stored, metadata } = await env.MEVO_KV.getWithMetadata<{ updated: number }>(DOCKED_KEY);
      // Before the first cron run (fresh deploy) scan on demand and wait for it.
      if (!stored) return json(await scanDocked(env), DOCKED_MAX_AGE_SECONDS);
      // Serve what we have; if the cron lagged (or doesn't run, as in local dev), refresh in the background.
      const updated = metadata?.updated ?? 0;
      if (now() - updated > DOCKED_STALE_AFTER_SECONDS && now() - lastScanStartedAt > MIN_SECONDS_BETWEEN_SCANS) ctx.waitUntil(scanDockedLoggingFailure(env, "stale refresh").catch(() => undefined));
      const res = new Response(stored, { headers: { "content-type": "application/json", "cache-control": `public, max-age=${DOCKED_MAX_AGE_SECONDS}` } });
      ctx.waitUntil(caches.default.put(key, res.clone()));
      return res;
    }
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
      console.error(`${new URL(request.url).pathname}: ${errorMessage(e)}`);
      return json({ error: errorMessage(e) }, 0, 502);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(scanDockedLoggingFailure(env, "cron").then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
