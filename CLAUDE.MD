# MEVO Route Planner

## What is this
A PWA web app for building multimodal routes using the Rowermevo city bike-sharing system (Trójmiasto — Gdańsk/Gdynia/Sopot). Google Maps doesn't integrate MEVO, so we build our own route planner.

## User scenario
1. User enters origin → destination
2. App finds optimal MEVO stations based on availability
3. Builds route: walk → station A (bike) → station B → walk
4. "Otwórz w Google Maps" button opens the route via waypoints

## Architecture
- `fetch-data.js` — Node script, fetches GBFS API and saves to `mevo-data.json`
- `index.html` — SPA, mobile-first, reads `mevo-data.json` locally
- Run: `node fetch-data.js && npx serve .`

## Data sources
- **MEVO GBFS API**: `https://gbfs.urbansharing.com/rowermevo.pl/`
  - Requires header: `Client-Identifier: mevo-route-planner`
  - `station_information.json` — coordinates, names, addresses, capacity
  - `station_status.json` — real-time: num_bikes, num_docks, vehicle_types_available
  - vehicle_type_id: `bike` (regular) and `ebike` (electric)
  - CORS blocks browser requests — so we fetch via Node
- **Nominatim** (OSM): address geocoding, free, CORS ok
- **OSRM**: routing (foot/bike), free, CORS ok
- **Google Maps URLs**: `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...|...&travelmode=bicycling`

## Station selection logic
- Departure station: nearest to origin with ≥1 bike of the required type (electric/classic/any)
- Arrival station: nearest to destination with ≥1 free dock
- Maximum search radius: 3 km
- Distance: haversine

## Warning thresholds
- 0 bikes/docks → station excluded
- 1-2 → yellow warning + suggestion to reserve (for departure) or alternative station (for arrival)
- 3+ → ok

## Tech stack
- Leaflet + OpenStreetMap (map)
- Nominatim (geocoding)
- OSRM (routing)
- Vanilla JS (no frameworks)
- UI language: Polish

## mevo-data.json format
```json
{
  "updated": "2025-01-01T12:00:00Z",
  "count": 250,
  "stations": [
    {
      "id": "3927",
      "name": "GDA099",
      "address": "aleja Jana Pawła II 48",
      "lat": 54.4025,
      "lon": 18.6108,
      "capacity": 10,
      "bikes": 2,    // regular
      "ebikes": 3,   // electric
      "docks": 5,    // free docks
      "active": true
    }
  ]
}
```

## TODO (v2)
- [ ] PWA manifest + service worker
- [ ] Choose from multiple station options (top 3)
- [ ] Trip cost calculation based on MEVO tariffs
- [ ] Auto-refresh data via Cloudflare Worker proxy
- [ ] ZTM integration (bus/tram + MEVO)
- [ ] Dark theme
- [ ] Deep link to MEVO app: `rowermevo://stations/{id}`

## Limitations
- Google Maps URL supports only one travelmode — we use `bicycling` for the entire route
- MEVO data is static (snapshot at the time fetch-data.js runs)
- OSRM public instance can be slow — for production, a self-hosted or paid instance is needed
