// Nominatim (OpenStreetMap) search, limited to the Tricity area.

import type { LatLon } from "./geo";

export interface Place {
  label: string; // what goes into the input: a place's name, or "street number"
  detail: string; // second line in suggestions: address / district / city
  coords: LatLon;
}

const TRICITY_VIEWBOX = "18.2,54.1,18.9,54.65";

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
}

interface NominatimResult {
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

function describe(p: NominatimResult): { label: string; detail: string } {
  const a = p.address ?? {};
  const street = a.road ?? a.pedestrian ?? a.footway;
  const streetLine = street ? [street, a.house_number].filter(Boolean).join(" ") : "";
  const area = [a.suburb ?? a.quarter ?? a.neighbourhood, a.city ?? a.town ?? a.village].filter(Boolean).join(", ");
  if (p.name) return { label: p.name, detail: [streetLine, area].filter(Boolean).join(", ") };
  if (streetLine) return { label: streetLine, detail: area };
  // No structured address: skip a bare house number at the front of display_name.
  const parts = p.display_name.split(", ").filter((x) => !/^\d+[a-zA-Z]?$/.test(x));
  return { label: parts[0] ?? p.display_name, detail: parts.slice(1, 3).join(", ") };
}

export async function searchPlaces(query: string, lang: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "6",
    addressdetails: "1",
    countrycodes: "pl",
    viewbox: TRICITY_VIEWBOX,
    bounded: "1",
    "accept-language": lang,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data: NominatimResult[] = await res.json();
  return data.map((p) => ({ ...describe(p), coords: [Number(p.lat), Number(p.lon)] }));
}
