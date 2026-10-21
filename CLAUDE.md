# MEVO Radar

## What is this
A web app for the Rowermevo city bike-sharing system (Trójmiasto — Gdańsk/Gdynia/Sopot) with three tabs on one map:
1. **Route planner (Trasa)** — origin → destination as walk → MEVO station (bike) → station → walk, with a Google Maps link. Google Maps doesn't integrate MEVO.
2. **Bike finder (Rower)** — find a specific bike by the number on its frame (e.g. `e4937`, `0366`), at a station or parked outside one, and keep tracking it.
3. **Live (Na żywo)** — system stats from MEVO (riding now, trips today, records, year over year) plus the fleet right now from our own data (available bikes, average battery, battery histogram, empty and fullest stations).

On phones, "Open in MEVO" buttons open a station or a specific bike in the official app.

Also: "you are here" dot + locate button, "Nearest bike" (top 3 places by real walking time), installable as a PWA (manifest + icons, no service worker yet).

UI languages: Polish (default for Polish browsers) and English. Unofficial — the UI says it is not affiliated with MEVO.

## Architecture
One Cloudflare Worker serves both the built React app (static assets) and the `/api/*` routes — one domain, one deploy, no CORS.

```
web/                browser app (Vite root): index.html, public/ (favicon, PWA manifest, icons)
  main.tsx          entry: providers, global styles, startup (geolocation, URL hash ↔ tracked bike sync)
  App.tsx           layout only
  components/       React components, one folder per area; a hook used by one component lives next to it
    route/          RoutePanel, RouteResult, PlaceInput, useAutoPlan
    bike/           BikePanel (camera follows the tracked bike), TrackedBikeCard, StationCard, NearbyList,
                    BikeChips, OpenInMevo, useFindNearest
    live/           LivePanel
    map/            MapView (pure MapLibre component), MapContainer (connects it), useMapMarkers, useTheme,
                    layers.ts, LocateButton, PickToast, MapToast
    panel/          the side panel / bottom sheet: Sheet, useSheetDrag, ErrorBoundary, Credit, BrandMark
    ui/             generic components with no app knowledge: Button, IconButton, Segmented, Notice, Pill,
                    Card, Actions, StopTitle, Icon (all icons), cx
  hooks/            hooks shared by several components: useTrackBike, useShowStation, useTrackedBike, useRouteStart
  store/            client state (Zustand): ui (tab, sheet, camera), location, bike (persisted), route;
                    urlSync.ts (the only code that touches location.hash)
  services/         talks to the network: api.ts (TanStack Query for /api/*, derived indexes via `select` /
                    `useQueries` `combine`; reads the bike/ui stores only to pick which stations to poll live),
                    routing (OSRM), geocode (Nominatim), planner, nearest
  utils/            pure helpers: bikeNumber, geo, mevoApp, recentPlaces, storage, viewport
  i18n/             index.tsx (provider, plural formatting), pl.ts, en.ts
  styles/           index.css (Tailwind entry, layer order), tokens.css (theme variables), base.css,
                    map.css (MapLibre controls and DOM markers)
worker/             Cloudflare Worker: index.ts (routes, edge cache), docked.ts (DockedBikes Durable Object),
                    mevo.ts (upstream sources), schemas.ts (zod)
shared/types.ts     API types used by both web/ and worker/
```

Imports inside web/ use the aliases `@/…` (web/) and `@shared/…`; same-folder imports stay `./…`.

Conventions:
- Server data lives only in TanStack Query; client state only in the Zustand stores — never copy one into the other.
- Components read stores and data themselves; actions that need both are hooks.
- A hook used by one component sits next to it; only hooks shared by several components go in `hooks/`, one per file.
- `store/`, `services/` and `utils/` never import components or hooks; `utils/` imports nothing but `utils/`;
  `components/ui/` imports nothing from the app.
- Effects live with the feature that needs them; one-off startup goes in `main.tsx`, not a global effects component.
- Use the `components/ui/` kit instead of repeating Tailwind class lists or inline SVGs; add a variant or an icon there.
- Style with Tailwind utilities using the theme tokens (`bg-surface`, `text-muted`, `border-line`, `desktop:` /
  `max-desktop:` at 900px). Global CSS only where utilities can't reach (MapLibre internals, DOM markers).
- One component per file, comments only for the non-obvious "why".

- Dev: `npm run dev` — Vite with `@cloudflare/vite-plugin` runs the app and the Worker together (http://localhost:5173).
- Typecheck: `npm run typecheck`. Build: `npm run build`. Deploy: `npm run deploy` (or push to `main`, see `.github/workflows/deploy.yml`).
- The DockedBikes Durable Object runs locally too (state in `.wrangler/`); the first `/api/docked` request starts its alarm loop, and each alarm logs `Docked full|incremental scan: N/870 stations re-queried …`.

## API (Worker)
| Route | Source | Freshness |
|---|---|---|
| `GET /api/stations` | GBFS `station_information` + `station_status` | edge cache 20 s |
| `GET /api/bikes` | GraphQL `freeFloatingVehicles` — bikes outside stations, with numbers; `appId` joined from GBFS `free_bike_status` by exact coordinates | edge cache 15 s |
| `GET /api/stats` | GraphQL `systemActiveTripCount` + `systemStats` | edge cache 30 s |
| `GET /api/docked` | GraphQL `dockGroupVehicles` per station — bikes at stations, with numbers | DockedBikes Durable Object, rescanned every 30 s; edge cache 15 s |
| `GET /api/stations/:id/bikes` | one `dockGroupVehicles` query — bikes at one station right now (`StationBikesResponse`); 404 for an unknown station | edge cache 10 s |

## Data sources
- **MEVO GBFS** `https://gbfs.urbansharing.com/rowermevo.pl/` — official open data, CORS open. Send `Client-Identifier: mevo-radar`. Station counts only; its `bike_id`s are anonymised and rotate after every trip.
- **Urban Sharing GraphQL** `https://core.urbansharing.com/public/api/v1/graphql` — what rowermevo.pl itself uses. Unofficial; needs headers `systemId: inurba-gdansk` and `Origin: https://rowermevo.pl` (CORS only allows rowermevo.pl, which is why it goes through the Worker).
  - `freeFloatingVehicles(systemId)` — bikes outside stations with `number`, `batteryCharge`, `currentRange`, `category`, `available`, `location`.
  - `dockGroupVehicles(dockGroupId)` — bikes at one station, no auth. No "all stations" variant, so the Worker batches ~40 aliased fields per query (~20 queries for a full scan, ~20 s). Station ids equal GBFS `station_id`.
  - `systemActiveTripCount { count }` and `systemStats { tripsToday tripsYesterday highscoreTrips tripsThisYear tripsLastYear uniqueUsersToday highscoreUniqueUsers highscoreUniqueUsersDate medianDurationToday medianDurationThisYear }` — the numbers on rowermevo.pl's live page, no auth.
  - `vehicle(...)`, `trips` need a logged-in user token — not usable. Introspection is disabled.
- **MEVO app links** — no https universal links; only the scheme `rowermevo://stations/<GBFS station_id>` and `rowermevo://vehicles/<GBFS bike_id>` (from GBFS `rental_uris`). Android package `com.urbansharing.citybike.gdansk`, iOS App Store id `6452801246` (GBFS `system_information.rental_apps`). GBFS bike ids are anonymised and rotate after every trip, so they are re-joined on every `/api/bikes` refresh.
- **Nominatim** (OSM) — geocoding, bounded to the Tricity viewbox.
- **OSRM by FOSSGIS** `https://routing.openstreetmap.de/routed-foot|routed-bike/...` — real foot and bike profiles. The OSRM demo server (`router.project-osrm.org`) ignores the profile and always routes by car — don't use it. FOSSGIS rate-limits bursts (HTTP 429), so use the `table` service for many distances at once.
- **Map tiles** — OpenFreeMap vector styles (`positron` light, `dark` dark), no key.

## Bikes at stations (data flow)
- One `DockedBikes` Durable Object (`getByName("docked")`) owns the list, in memory and persisted as one storage value so it survives eviction.
- Its alarm fires every 30 s (one alarm per object, so loops can't stack; `list()` re-arms a missing one, e.g. after a deploy). Each alarm fetches GBFS `station_status`, compares per-station counts (bikes per type + free docks; `last_reported` is the feed time for every station, useless) with the snapshot and re-queries only changed stations, ~40 per aliased query.
- Full scan when there is no snapshot yet and every 10 min (counts can stay equal while one bike leaves and another arrives).
- Resilience: a chunk is retried once within the subrequest budget; failed stations keep their old bikes and are re-queried next alarm; a full scan with > 50 % failed chunks keeps the old list. A bike seen fresh at one station is removed from stale lists elsewhere.
- Web: `useAllBikes` polls `/api/stations/:id/bikes` every 15 s for the open station card and for the station where the docked list last saw the tracked bike (bike tab only), and merges it over the docked list; a bike missing from its station's live result disappears like a bike on a trip.

## Station selection logic
- Pickup: of the 5 nearest active stations within 3 km that have ≥1 bike of the wanted type (any/electric/classic), the one with the shortest real walking distance (one OSRM table request).
- If no station has a bike, the nearest free-floating bike is used as the pickup.
- A free-floating bike closer than the pickup station is suggested.
- Drop-off: same rule near the destination, for stations with ≥1 free dock.
- Bike leg duration: at least distance / 15 km/h (the bike profile is optimistic for city riding).

## Warning thresholds
- 0 bikes/docks → station excluded
- 1–2 → yellow warning (reserve in the MEVO app; alternative drop-off station with ≥3 docks)
- 3+ → ok

## Deployment
- Live at https://mevoradar.pl (also `www.` and https://mevo-radar.maks-naumovich2349.workers.dev). Domain registered at home.pl, DNS on Cloudflare (nameservers `angela`/`duke.ns.cloudflare.com`).
- `wrangler.jsonc` holds the Durable Object binding + migration and the custom-domain routes — not secrets, keep them committed. The old KV namespace `MEVO_KV` (id `2f525e40e5bf424da844ef4a2b25c101`) is no longer bound and can be deleted in the dashboard. `triggers.crons` is an explicit `[]` so a deploy removes the old cron.
- Pushes to `main` deploy via `.github/workflows/deploy.yml`; it needs repository secrets `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers") and `CLOUDFLARE_ACCOUNT_ID`. Each run is recorded as a `production` deployment (URL on the run page and in the repo sidebar) and writes a job summary with the live URLs, commit and Worker version.
- Manual deploy: `npx wrangler login` once, then `npm run deploy`. Deploys use the config the build writes (`dist/mevo_radar/wrangler.json`), because Vite's root is `web/`.
- Free-plan limits that shape the design (Cloudflare docs, checked 2026-10; reset 00:00 UTC):
  - Workers: 100,000 requests/day, 50 subrequests per invocation, 6 connections waiting at once.
  - Durable Objects (SQLite-backed only): 100,000 requests/day (alarms count), 13,000 GB-s duration/day
    (wall clock × 128 MB; not billed once hibernated, which happens after 10 s idle without timers/sockets),
    100,000 SQLite rows written/day (each `setAlarm` is one), 5 M rows read/day, 2 MB per value.
  - Estimate for the 30 s alarm: 2,880 alarms/day; ~5,800 rows written/day (alarm + snapshot);
    ~4,700 GB-s/day (≈12 s billed per alarm), 10,800 GB-s/day if it never hibernated.
    Per alarm 1–2 GBFS requests + ~1–3 GraphQL queries; a full scan (every 10 min) is ~22 queries, ~3–4 s.
  - Visitors' polling (/api/bikes 15 s, /api/docked 30 s, /api/stations 30 s, station live 15 s) is what
    eats the 100k Worker requests/day: roughly 500–700 requests per open tab per hour.

## Gotchas
- MapLibre 6 finds its web worker relative to its own bundle at runtime. `MapView.tsx` bundles it via `?worker&url` + `setWorkerUrl`, and `vite.config.ts` excludes `maplibre-gl` from dependency prebundling so the main thread and the worker share the same module code. Without both, the map stays blank.

## TODO
- [ ] Service worker (offline shell, push notifications) — the manifest and icons are done
- [ ] Choose from multiple station options (top 3)
- [ ] Trip cost calculation based on MEVO tariffs
- [ ] ZTM integration (bus/tram + MEVO)
- [ ] Notify when a tracked bike becomes available

## Limitations
- Google Maps URLs support one travel mode — `bicycling` is used for the whole route.
- A bike that is on a trip is not visible anywhere until it is parked again.
- The GraphQL API is unofficial and may change or close without notice.
