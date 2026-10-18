import { useEffect, useMemo, useRef, useState } from "react";
import { useSheetDrag } from "./lib/useSheetDrag";
import { useLocation } from "./lib/useLocation";
import { findNearest, type NearbyPlace } from "./lib/nearest";
import type { Bike } from "../shared/types";
import { normalizeNumber, useAllBikes, useStations, useSystemStats } from "./api";
import { BikePanel } from "./components/BikePanel";
import { Credit } from "./components/Credit";
import { LivePanel } from "./components/LivePanel";
import { MapView, type CameraRequest, type MapMarker } from "./components/MapView";
import type { PlaceValue } from "./components/PlaceInput";
import { RoutePanel, type PlanStatus } from "./components/RoutePanel";
import { useI18n, type Lang } from "./i18n";
import type { LatLon } from "./lib/geo";
import { planTrip, stationPos, type BikePreference, type TripPlan } from "./lib/planner";

type Tab = "route" | "bike" | "live";
const TRACK_KEY = "mevo.tracked";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const isPhone = () => window.matchMedia("(max-width: 899px)").matches;

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" />
      <circle cx="9.5" cy="20" r="5" />
      <circle cx="22.5" cy="20" r="5" />
      <path d="M9.5 20l5-8.5h6.5l1.5 8.5M12.5 11.5h4.5" />
    </svg>
  );
}

function useSystemTheme() {
  const [dark, setDark] = useState(darkQuery.matches);
  useEffect(() => {
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    darkQuery.addEventListener("change", on);
    return () => darkQuery.removeEventListener("change", on);
  }, []);
  return dark ? "dark" : "light";
}

function initialTracked(): string | null {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash) return normalizeNumber(hash);
  try {
    return localStorage.getItem(TRACK_KEY);
  } catch {
    return null;
  }
}

export function App() {
  const { t, lang, setLang } = useI18n();
  const theme = useSystemTheme();
  const stationsQuery = useStations();
  const stations = stationsQuery.data?.stations ?? [];
  const stationsById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const all = useAllBikes();

  const [tab, setTab] = useState<Tab>(() => (location.hash.length > 1 ? "bike" : "route"));
  const statsQuery = useSystemStats(tab === "live");
  const [expanded, setExpanded] = useState(true);
  const sheetRef = useRef<HTMLElement>(null);
  const userLocation = useLocation();
  const [locateHint, setLocateHint] = useState(false);
  const [nearby, setNearby] = useState<{ loading: boolean; places: NearbyPlace[] | null; error: "location" | "none" | null }>({
    loading: false,
    places: null,
    error: null,
  });
  const dragHandlers = useSheetDrag(sheetRef, expanded, setExpanded);
  const [camera, setCamera] = useState<CameraRequest | null>(null);
  const moveCamera = (c: Omit<CameraRequest, "key">) => setCamera({ ...c, key: Date.now() });

  // Route planning
  const [from, setFrom] = useState<PlaceValue | null>(null);
  const [to, setTo] = useState<PlaceValue | null>(null);
  const [activeField, setActiveField] = useState<"from" | "to">("from");
  const [pref, setPref] = useState<BikePreference>("any");
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [status, setStatus] = useState<PlanStatus>("idle");

  // Bike tracking
  const [tracked, setTracked] = useState<string | null>(initialTracked);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const lastSeen = useRef<Bike | null>(null);
  const trackedBike = tracked ? (all.bikes.get(tracked) ?? null) : null;
  if (trackedBike) lastSeen.current = trackedBike;
  else if (lastSeen.current && lastSeen.current.number.toLowerCase() !== tracked) lastSeen.current = null;

  const freeBikes = useMemo(() => all.list.filter((b) => !b.stationId), [all.list]);
  const selectedStation = selectedStationId ? (stationsById.get(selectedStationId) ?? null) : null;
  const stationBikes = useMemo(
    () =>
      selectedStationId
        ? all.list
            .filter((b) => b.stationId === selectedStationId)
            .sort((a, b) => Number(b.available) - Number(a.available) || (b.battery ?? -1) - (a.battery ?? -1))
        : [],
    [all.list, selectedStationId],
  );

  const track = (number: string) => {
    const key = all.resolve(number);
    setNearby((n) => (n.places ? { loading: false, places: null, error: null } : n));
    setTracked(key);
    setTab("bike");
    setExpanded(true);
    history.replaceState(null, "", `#${key}`);
    try {
      localStorage.setItem(TRACK_KEY, key);
    } catch {}
    const b = all.bikes.get(key);
    if (b) moveCamera({ center: [b.lat, b.lon], zoom: 16.5 });
  };

  const untrack = () => {
    setTracked(null);
    history.replaceState(null, "", location.pathname);
    try {
      localStorage.removeItem(TRACK_KEY);
    } catch {}
  };

  // Editing "#e4937" in the address bar of an open page switches the tracked bike.
  useEffect(() => {
    const onHash = () => {
      const n = normalizeNumber(decodeURIComponent(location.hash.slice(1)));
      if (n) track(n);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  });

  // A tracked bike from a link may only be resolvable once data arrives ("4937" → "e4937").
  const resolvedOnce = useRef(false);
  useEffect(() => {
    if (!tracked || resolvedOnce.current || !all.freeLoaded) return;
    const key = all.resolve(tracked);
    const b = all.bikes.get(key);
    if (b) {
      resolvedOnce.current = true;
      if (key !== tracked) setTracked(key);
      if (tab === "bike") moveCamera({ center: [b.lat, b.lon], zoom: 16.5 });
    }
  }, [all, tracked, tab]);

  // Only an explicit tap asks for location; a refusal shows a short hint instead of re-prompting.
  const locate = async (): Promise<LatLon | null> => {
    const pos = userLocation.pos ?? (await userLocation.request());
    if (!pos) {
      setLocateHint(true);
      setTimeout(() => setLocateHint(false), 5000);
    }
    return pos;
  };

  const showNearest = async () => {
    resolvedOnce.current = true; // the user asked for nearby bikes; don't also fly to an old tracked bike
    setTab("bike");
    setExpanded(true);
    setNearby({ loading: true, places: null, error: null });
    const pos = await locate();
    if (!pos) return setNearby({ loading: false, places: null, error: "location" });
    const places = await findNearest(pos, all.list, stationsById);
    setNearby({ loading: false, places, error: places.length ? null : "none" });
    if (places.length) moveCamera({ bounds: [pos, ...places.map((p) => p.pos)] });
  };

  const runPlan = async () => {
    if (!from || !to) return setStatus("needBoth");
    setStatus("loading");
    setPlan(null);
    try {
      const result = await planTrip(from.coords, to.coords, pref, stations, all.list);
      if (typeof result === "string") return setStatus(result);
      setPlan(result);
      setStatus("idle");
      moveCamera({ bounds: result.legs.flatMap((l) => l.line) });
    } catch {
      setStatus("failed");
    }
  };

  const onMapClick = (pos: LatLon) => {
    if (tab !== "route") return setSelectedStationId(null);
    const place = { label: t("pointOnMap"), coords: pos };
    if (activeField === "from") {
      setFrom(place);
      setActiveField("to");
    } else setTo(place);
    setPlan(null);
  };

  const markers = useMemo<MapMarker[]>(() => {
    if (tab === "bike") {
      // While the nearest-bike list is open it owns the map; picking a place switches to tracking.
      if (nearby.places?.length) return nearby.places.map((p, i) => ({ kind: "nearby" as const, pos: p.pos, label: String(i + 1) }));
      const b = trackedBike ?? lastSeen.current;
      return b ? [{ kind: "bike", pos: [b.lat, b.lon], label: b.number }] : [];
    }
    const m: MapMarker[] = [];
    if (plan) {
      m.push({ kind: "pickup", pos: plan.pickup.pos, label: "A" }, { kind: "dropoff", pos: stationPos(plan.dropoff), label: "B" });
    }
    if (from) m.push({ kind: "from", pos: from.coords });
    if (to) m.push({ kind: "to", pos: to.coords });
    return m;
  }, [tab, trackedBike, plan, from, to, nearby.places]);

  const live = !stationsQuery.isError && !all.error;
  const totalBikes = stations.reduce((n, s) => n + s.bikes + s.ebikes, 0) + freeBikes.length;

  return (
    <div className="app">
      <MapView
        theme={theme}
        stations={stations}
        freeBikes={freeBikes}
        plan={tab === "route" ? plan : null}
        markers={markers}
        camera={camera}
        me={userLocation.pos}
        dimStations={tab === "route" && plan !== null}
        onStationClick={(id) => {
          setSelectedStationId(id);
          setTab("bike");
          setExpanded(true);
          const s = stationsById.get(id);
          if (s) moveCamera({ center: stationPos(s) });
        }}
        onBikeClick={track}
        onMapClick={onMapClick}
        onUserMove={() => {
          // On phones the sheet covers half the map; get out of the way while the user explores.
          if (isPhone()) setExpanded(false);
        }}
      />

      <button
        type="button"
        className={`locate-btn${userLocation.pos ? " on" : ""}${userLocation.status === "locating" ? " busy" : ""}`}
        onClick={async () => {
          const pos = await locate();
          if (pos) moveCamera({ center: pos, zoom: 16 });
        }}
        aria-label={t("whereAmI")}
        title={t("whereAmI")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {locateHint && <p className="locate-hint" role="status">{t(userLocation.status === "denied" ? "locationDenied" : "locationUnavailable")}</p>}

      <button type="button" className="sheet-open" hidden={expanded} onClick={() => setExpanded(true)} aria-label={t("showPanel")}>
        <BrandMark />
        <span>{t("appName")}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <aside ref={sheetRef} className={`sheet${expanded ? "" : " collapsed"}`} aria-hidden={!expanded && !isPhone()}>
        <div className="sheet-top" {...dragHandlers}>
          <button
            type="button"
            className="grabber"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? t("hidePanel") : t("showPanel")}
            aria-expanded={expanded}
          />
          <header className="sheet-head">
            <div className="brand">
              <BrandMark />
              <div className="brand-text">
                <span className="brand-name">{t("appName")}</span>
                <span className={`live${live ? "" : " off"}`} title={live ? t("liveData") : t("offline")}>
                  {stations.length > 0 ? t("stationsCount", { s: stations.length, b: totalBikes }) : "…"}
                </span>
              </div>
            </div>
            <div className="head-tools">
              <div className="lang" role="group" aria-label={t("language")}>
                {(["pl", "en"] as Lang[]).map((l) => (
                  <button key={l} type="button" className={lang === l ? "on" : ""} aria-pressed={lang === l} onClick={() => setLang(l)}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="icon-btn collapse-btn"
                onClick={() => setExpanded((e) => !e)}
                aria-label={expanded ? t("hidePanel") : t("showPanel")}
                title={expanded ? t("hidePanel") : t("showPanel")}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </header>

          <nav className="tabs" role="tablist">
            {(["route", "bike", "live"] as Tab[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={tab === v}
                className={tab === v ? "on" : ""}
                onClick={() => {
                  setTab(v);
                  setExpanded(true);
                }}
              >
                {t(v === "route" ? "tabRoute" : v === "bike" ? "tabBike" : "tabLive")}
                {v === "live" && <span className="tab-dot" aria-hidden="true" />}
              </button>
            ))}
          </nav>
        </div>

        {!live && <p className="notice notice-error">{t("offline")}</p>}

        {tab === "live" ? (
          <LivePanel
            stats={statsQuery.data}
            statsError={statsQuery.isError}
            stations={stations}
            bikes={all.list}
            onStation={(id) => {
              setSelectedStationId(id);
              setTab("bike");
              const s = stationsById.get(id);
              if (s) moveCamera({ center: stationPos(s) });
            }}
          />
        ) : tab === "route" ? (
          <RoutePanel
            from={from}
            to={to}
            onFrom={(v) => {
              setFrom(v);
              setPlan(null);
            }}
            onTo={(v) => {
              setTo(v);
              setPlan(null);
            }}
            onActiveField={setActiveField}
            pref={pref}
            onPref={(p) => {
              setPref(p);
              setPlan(null);
            }}
            plan={plan}
            status={status}
            onPlan={runPlan}
            onBike={track}
          />
        ) : (
          <BikePanel
            trackedNumber={tracked}
            bike={trackedBike}
            lastSeen={lastSeen.current}
            dockedLoaded={all.dockedLoaded}
            dockedUpdated={all.dockedUpdated}
            stations={stations}
            stationsById={stationsById}
            selectedStation={selectedStation}
            stationBikes={stationBikes}
            onSearch={track}
            nearby={nearby}
            onFindNearest={showNearest}
            onTrack={track}
            onUntrack={untrack}
            onCloseStation={() => setSelectedStationId(null)}
          />
        )}
        <Credit />
      </aside>
    </div>
  );
}
