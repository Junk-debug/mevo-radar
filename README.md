# MEVO Radar

**[mevoradar.pl](https://mevoradar.pl)** — an unofficial companion for [MEVO](https://rowermevo.pl), the city bike-share of Gdańsk, Gdynia and Sopot.

- **Route planner (Trasa).** Type where you're going — the start defaults to your location — and the walk → bike → walk trip appears on its own: total time and arrival, where to pick up a bike (with the bikes waiting there), where to leave it, and links to the MEVO app and Google Maps. Recent places and picking a point on the map are one tap away.
- **Bike finder (Rower).** Type the number from a bike's frame (`e4937`, `0366`) and see where it is right now — at a station or parked anywhere — with its battery level. Tracking survives reloads, and `mevoradar.pl/#e4937` links straight to a bike.

- **Live (Na żywo).** How many people are riding right now, trips today, records and the year so far — plus the fleet at this moment: available bikes, average e-bike battery, empty and fullest stations.
- **Open in MEVO.** On phones, one tap opens the station or the exact bike in the official MEVO app (or its store page if it isn't installed).

- **Nearest bike.** One tap shows the three closest places to grab a bike, by real walking time, with the best battery at each. Location is only asked for when you tap.

Polish and English, light and dark themes, works on phones — and installs to the home screen as an app.

> Not affiliated with MEVO or Urban Sharing. Data comes from MEVO's public GBFS feed and the API behind rowermevo.pl, which may change without notice.

## Features

**Route planner**
- Address search (OpenStreetMap Nominatim, limited to the Tricity) or tap points on the map
- Bike type: any, electric or classic
- Pickup = the station with the shortest real walk among the 5 nearest within 3 km that have a matching bike; drop-off = same rule for free docks
- Falls back to a free-floating bike when no station has one, and points out a free bike closer than the station
- Frame numbers and battery of the bikes waiting at the pickup station
- Warnings when only 1–2 bikes or docks are left, with an alternative drop-off station
- Walking and cycling routes on real foot/bike profiles; total time split into walk / ride / walk
- "Open in Google Maps" with both stations as waypoints

**Bike finder**
- Search by frame number, forgiving input (`4937` finds `e4937`)
- Bikes at stations and outside them, refreshed every 15 s (outside) and 30 s (at stations); an open station and the tracked bike's station are queried live every 15 s
- Status: free, at a station, unavailable (service or flat battery), or on a trip
- Tap any station to list its bikes with battery levels; tap any bike on the map to track it
- Walking directions to the bike, copy number

**Map**
- Every station with its live bike count (green: plenty, amber: 1–2, grey: empty) and every free-floating bike (electric / classic)

## How it works

One Cloudflare Worker serves the React app and a small API:

| Route | What | Freshness |
|---|---|---|
| `/api/stations` | stations and live counts (GBFS) | 20 s |
| `/api/bikes` | bikes outside stations, with numbers | 15 s |
| `/api/stats` | riding now, trips today, records | 30 s |
| `/api/docked` | bikes at stations, with numbers | 30 s (Durable Object) |
| `/api/stations/:id/bikes` | bikes at one station, with numbers, live | 10 s |

The bike-number API only answers requests from rowermevo.pl and lists bikes one station at a time, so the Worker fetches it server-side. A Durable Object keeps the list of bikes at stations: every 30 s it reads the official station counts and re-queries only the stations whose counts changed, with a full scan every 10 minutes.

## Development

```bash
npm install
npm run dev        # app + Worker together on http://localhost:5173
npm run typecheck
npm run build
npm run deploy     # build and deploy to Cloudflare
```

Stack: Vite, React, TypeScript, MapLibre GL with OpenFreeMap tiles, TanStack Query, Cloudflare Workers + Durable Objects. Routing by OSRM on [routing.openstreetmap.de](https://routing.openstreetmap.de) (FOSSGIS), geocoding by Nominatim.

Pushes to `main` deploy automatically via GitHub Actions (needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets).

More detail for contributors (data sources, gotchas, limits) is in [CLAUDE.md](CLAUDE.md).

## Credits

Made in Gdańsk by [Maksim Navumovich](https://github.com/Junk-debug).

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · tiles by [OpenFreeMap](https://openfreemap.org) · bike data © MEVO / Urban Sharing.
