// Nominatim (OpenStreetMap) search, limited to the Tricity area.

import type { LatLon } from "./geo";

export interface Place {
  label: string;
  detail: string;
  coords: LatLon;
}

const TRICITY_VIEWBOX = "18.2,54.1,18.9,54.65";

export async function searchPlaces(query: string, lang: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "6",
    countrycodes: "pl",
    viewbox: TRICITY_VIEWBOX,
    bounded: "1",
    "accept-language": lang,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data: { display_name: string; name?: string; lat: string; lon: string }[] = await res.json();
  return data.map((p) => {
    const parts = p.display_name.split(", ");
    const label = p.name || parts[0];
    return {
      label,
      detail: parts.filter((x) => x !== label).slice(0, 3).join(", "),
      coords: [Number(p.lat), Number(p.lon)],
    };
  });
}
