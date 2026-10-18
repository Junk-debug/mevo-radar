import { createContext, useContext, useState, type ReactNode } from "react";

const pl = {
  appName: "MEVO Radar",
  unofficial: "Nieoficjalna aplikacja, niezwiązana z MEVO. Dane: MEVO (GBFS), OpenStreetMap.",
  tabRoute: "Trasa",
  tabBike: "Rower",
  from: "Skąd",
  to: "Dokąd",
  placePlaceholder: "Adres lub miejsce",
  myLocation: "Moja lokalizacja",
  useMyLocation: "Użyj mojej lokalizacji",
  swap: "Zamień start i cel",
  pickOnMap: "Kliknij na mapie, aby wybrać punkt",
  pointOnMap: "Punkt na mapie",
  prefAny: "Dowolny",
  prefEbike: "Elektryczny",
  prefBike: "Klasyczny",
  findRoute: "Wyznacz trasę",
  searching: "Szukam trasy…",
  needBoth: "Podaj start i cel — wybierz adres z podpowiedzi albo kliknij na mapie.",
  noBikes: "Brak rowerów w promieniu 3 km od startu.",
  noDocks: "Brak stacji z wolnymi miejscami w promieniu 3 km od celu.",
  routeFailed: "Nie udało się wyznaczyć trasy. Spróbuj ponownie.",
  walk: "Pieszo",
  ride: "Rowerem",
  total: "Razem",
  pickupStation: "Weź rower",
  pickupFreeBike: "Weź wolny rower",
  dropoffStation: "Zostaw rower",
  bikesHere: "Rowery na stacji",
  freeDocks: "wolne miejsca",
  bikesShort: "rowery",
  ebikesShort: "elektr.",
  lowBikes: "{n:Został|Zostały|Zostało} tylko {n} — zarezerwuj w aplikacji MEVO.",
  lowDocks: "Tylko {n} {n:wolne miejsce|wolne miejsca|wolnych miejsc}. Alternatywa: {alt} ({docks} {docks:miejsce|miejsca|miejsc}).",
  lowDocksNoAlt: "Tylko {n} {n:wolne miejsce|wolne miejsca|wolnych miejsc} — może zabraknąć miejsca.",
  closerFreeBike: "Wolny rower {number} stoi {dist} od startu — bliżej niż stacja.",
  openInGoogle: "Otwórz w Google Maps",
  openInMevo: "Otwórz w aplikacji MEVO",
  walkThere: "Dojdź pieszo",
  bikeSearchPlaceholder: "Numer roweru, np. e4937",
  find: "Znajdź",
  bikeHint: "Numer jest na ramie i w aplikacji. Możesz też kliknąć stację lub rower na mapie.",
  statusFree: "Wolny — możesz go wziąć",
  statusAtStation: "Na stacji — możesz go wziąć",
  statusUnavailable: "Stoi, ale niedostępny (serwis lub rozładowany)",
  statusRiding: "Zniknął z mapy — ktoś nim jedzie",
  statusNotFound: "Nie widać go teraz ani na stacji, ani poza nią",
  statusLoading: "Szukam… numery na stacjach jeszcze się ładują",
  notFoundHint: "Rower jest w trasie, w serwisie albo numer jest błędny. Sprawdzamy co 15 s i pokażemy go, gdy się pojawi.",
  lastSeen: "Ostatnio widziany",
  type: "Typ",
  ebike: "Elektryczny",
  bike: "Klasyczny",
  battery: "Bateria",
  station: "Stacja",
  outsideStation: "Poza stacją",
  nearStation: "Najbliższa stacja",
  stopTracking: "Przestań śledzić",
  copyNumber: "Kopiuj numer",
  copied: "Skopiowano",
  stationBikes: "{n} {n:rower|rowery|rowerów}",
  numbersAt: "numery z {time}",
  numbersLoading: "numery się ładują",
  unavailableBike: "niedostępny",
  liveData: "Dane na żywo",
  offline: "Brak połączenia z MEVO",
  legendStation: "Stacja",
  legendFreeBike: "Wolny rower",
  language: "Język",
  close: "Zamknij",
  stationsCount: "{s} {s:stacja|stacje|stacji} · {b} {b:rower|rowery|rowerów}",
  numbersOutOfDate: "Na stacji jest teraz {total}, a na liście numerów {listed} — lista odświeża się co ok. 2 min.",
};

type Dict = typeof pl;
export type MessageKey = keyof Dict;

const en: Dict = {
  appName: "MEVO Radar",
  unofficial: "Unofficial app, not affiliated with MEVO. Data: MEVO (GBFS), OpenStreetMap.",
  tabRoute: "Route",
  tabBike: "Bike",
  from: "From",
  to: "To",
  placePlaceholder: "Address or place",
  myLocation: "My location",
  useMyLocation: "Use my location",
  swap: "Swap start and destination",
  pickOnMap: "Click the map to choose a point",
  pointOnMap: "Point on the map",
  prefAny: "Any",
  prefEbike: "Electric",
  prefBike: "Classic",
  findRoute: "Find route",
  searching: "Finding a route…",
  needBoth: "Enter a start and a destination — pick an address from the suggestions or click the map.",
  noBikes: "No bikes within 3 km of the start.",
  noDocks: "No station with free spots within 3 km of the destination.",
  routeFailed: "Couldn't build the route. Try again.",
  walk: "Walk",
  ride: "Ride",
  total: "Total",
  pickupStation: "Pick up",
  pickupFreeBike: "Pick up free bike",
  dropoffStation: "Drop off",
  bikesHere: "Bikes at the station",
  freeDocks: "free spots",
  bikesShort: "bikes",
  ebikesShort: "e-bikes",
  lowBikes: "Only {n} left — reserve one in the MEVO app.",
  lowDocks: "Only {n} free {n:spot|spots}. Alternative: {alt} ({docks} {docks:spot|spots}).",
  lowDocksNoAlt: "Only {n} free {n:spot|spots} — it may fill up.",
  closerFreeBike: "Free bike {number} is {dist} from the start — closer than the station.",
  openInGoogle: "Open in Google Maps",
  openInMevo: "Open in the MEVO app",
  walkThere: "Walk there",
  bikeSearchPlaceholder: "Bike number, e.g. e4937",
  find: "Find",
  bikeHint: "The number is on the frame and in the app. You can also tap a station or a bike on the map.",
  statusFree: "Free — you can take it",
  statusAtStation: "At a station — you can take it",
  statusUnavailable: "Parked but unavailable (service or flat battery)",
  statusRiding: "Gone from the map — someone is riding it",
  statusNotFound: "Not at a station or parked anywhere right now",
  statusLoading: "Searching… station bike numbers are still loading",
  notFoundHint: "The bike is on a trip, in service, or the number is wrong. We check every 15 s and will show it when it reappears.",
  lastSeen: "Last seen",
  type: "Type",
  ebike: "Electric",
  bike: "Classic",
  battery: "Battery",
  station: "Station",
  outsideStation: "Outside a station",
  nearStation: "Nearest station",
  stopTracking: "Stop tracking",
  copyNumber: "Copy number",
  copied: "Copied",
  stationBikes: "{n} {n:bike|bikes}",
  numbersAt: "numbers from {time}",
  numbersLoading: "numbers loading",
  unavailableBike: "unavailable",
  liveData: "Live data",
  offline: "Can't reach MEVO",
  legendStation: "Station",
  legendFreeBike: "Free bike",
  language: "Language",
  close: "Close",
  stationsCount: "{s} {s:station|stations} · {b} {b:bike|bikes}",
  numbersOutOfDate: "The station has {total} now, the number list shows {listed} — it refreshes about every 2 min.",
};

export type Lang = "pl" | "en";
const dicts: Record<Lang, Dict> = { pl, en };
const STORAGE_KEY = "mevo.lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pl" || saved === "en") return saved;
  } catch {}
  return navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
}

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;
const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: T } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };
  // "{n}" inserts a value; "{n:one|few|many}" (Polish) or "{n:one|other}" (English) picks a plural form.
  const plural = new Intl.PluralRules(lang);
  const t: T = (key, vars) =>
    dicts[lang][key]
      .replace(/\{(\w+):([^}]+)\}/g, (_, v: string, forms: string) => {
        const f = forms.split("|");
        const cat = plural.select(Number(vars?.[v] ?? 0));
        return (cat === "one" ? f[0] : cat === "few" ? f[1] : f[f.length - 1]) ?? "";
      })
      .replace(/\{(\w+)\}/g, (_, v: string) => String(vars?.[v] ?? `{${v}}`));
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
