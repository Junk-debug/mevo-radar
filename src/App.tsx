import { useEffect, useMemo, useRef, useState } from "react";
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
  }, [tab, trackedBike, plan, from, to]);

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
      />

      <aside className={`sheet${expanded ? "" : " collapsed"}`}>
        <button
          type="button"
          className="grabber"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? t("close") : t("appName")}
          aria-expanded={expanded}
        />
        <header className="sheet-head">
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="9" />
              <circle cx="9.5" cy="20" r="5" />
              <circle cx="22.5" cy="20" r="5" />
              <path d="M9.5 20l5-8.5h6.5l1.5 8.5M12.5 11.5h4.5" />
            </svg>
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
