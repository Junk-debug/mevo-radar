// Cloudflare Worker — CORS proxy for MEVO GBFS API
// Deploy: npx wrangler deploy worker.js --name mevo-gbfs-proxy

const GBFS_BASE = "https://gbfs.urbansharing.com/rowermevo.pl";
const ALLOWED_ENDPOINTS = [
  "station_information.json",
  "station_status.json",
  "free_bike_status.json",
  "vehicle_types.json",
  "gbfs.json",
];
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const CACHE_TTL = 30; // seconds

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const endpoint = url.pathname.replace(/^\//, "");

    if (!endpoint || endpoint === "") {
      return Response.json(
        { endpoints: ALLOWED_ENDPOINTS },
        { headers: CORS_HEADERS }
      );
    }

    if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
      return Response.json(
        { error: "Unknown endpoint" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    try {
      const resp = await fetch(`${GBFS_BASE}/${endpoint}`, {
        headers: { "Client-Identifier": "mevo-route-planner" },
        cf: { cacheTtl: CACHE_TTL },
      });

      const data = await resp.text();
      return new Response(data, {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${CACHE_TTL}`,
        },
      });
    } catch (e) {
      return Response.json(
        { error: "GBFS fetch failed" },
        { status: 502, headers: CORS_HEADERS }
      );
    }
  },
};
