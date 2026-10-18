import { useEffect, useState } from "react";
import type { Bike, Station } from "../../shared/types";
import { useI18n } from "../i18n";
import { formatDistance, haversine } from "../lib/geo";
import { stationPos, walkingDirectionsUrl } from "../lib/planner";
import { BikeChips } from "./BikeChips";
import { OpenInMevo } from "./OpenInMevo";
import type { NearbyPlace } from "../lib/nearest";

interface Props {
  trackedNumber: string | null;
  bike: Bike | null;
  lastSeen: Bike | null;
  dockedLoaded: boolean;
  dockedUpdated: number | null;
  stations: Station[];
  stationsById: Map<string, Station>;
  selectedStation: Station | null;
  stationBikes: Bike[];
  onSearch: (query: string) => void;
  nearby: { loading: boolean; places: NearbyPlace[] | null; error: "location" | "none" | null };
  onFindNearest: () => void;
  onTrack: (number: string) => void;
  onUntrack: () => void;
  onCloseStation: () => void;
}

const time = (unix: number) => new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function nearestStation(stations: Station[], b: Bike) {
  let best: { s: Station; d: number } | null = null;
  for (const s of stations) {
    const d = haversine([b.lat, b.lon], stationPos(s));
    if (!best || d < best.d) best = { s, d };
  }
  return best;
}

function TrackedCard(p: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const { bike, lastSeen } = p;
  const station = bike?.stationId ? p.stationsById.get(bike.stationId) : null;
  const near = bike && !station ? nearestStation(p.stations, bike) : null;

  let status: { text: string; tone: "ok" | "warn" | "gone" };
  if (bike) {
    status = !bike.available
      ? { text: t("statusUnavailable"), tone: "warn" }
      : { text: t(station ? "statusAtStation" : "statusFree"), tone: "ok" };
  } else if (!p.dockedLoaded) status = { text: t("statusLoading"), tone: "warn" };
  else status = { text: t(lastSeen ? "statusRiding" : "statusNotFound"), tone: "gone" };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bike?.number ?? p.trackedNumber ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const where = bike ?? lastSeen;
  return (
    <section className="card tracked" aria-live="polite">
      <span className={`pill pill-${status.tone}`}>{status.text}</span>
      <h2 className="bike-number">{bike?.number ?? lastSeen?.number ?? p.trackedNumber}</h2>
      {bike ? (
        <dl className="facts">
          <dt>{t("type")}</dt>
          <dd>{t(bike.type)}</dd>
          {bike.type === "ebike" && bike.battery != null && (
            <>
              <dt>{t("battery")}</dt>
              <dd className="battery">
                <span className="gauge"><i style={{ width: `${bike.battery}%` }} /></span>
                {bike.battery}%{bike.range != null && ` · ~${Math.round(bike.range / 1000)} km`}
              </dd>
            </>
          )}
          {station ? (
            <>
              <dt>{t("station")}</dt>
              <dd>
                <b>{station.name}</b>
                <small>{station.address}</small>
              </dd>
            </>
          ) : (
            <>
              <dt>{t("outsideStation")}</dt>
              <dd>
                {near && (
                  <>
                    {t("nearStation")}: <b>{near.s.name}</b>, {formatDistance(near.d)}
                    <small>{near.s.address}</small>
                  </>
                )}
              </dd>
            </>
          )}
        </dl>
      ) : (
        <p className="muted">{p.dockedLoaded ? t("notFoundHint") : ""}</p>
      )}
      <div className="actions">
        {bike && (
          <OpenInMevo
            target={bike.appId ? { kind: "vehicle", id: bike.appId } : bike.stationId ? { kind: "station", id: bike.stationId } : { kind: "app" }}
          />
        )}
        {where && (
          <a className="btn" href={walkingDirectionsUrl([where.lat, where.lon])} target="_blank" rel="noopener">
            {t("walkThere")}
          </a>
        )}
        <button type="button" className="btn ghost" onClick={copy}>{copied ? t("copied") : t("copyNumber")}</button>
        <button type="button" className="btn ghost" onClick={p.onUntrack}>{t("stopTracking")}</button>
      </div>
    </section>
  );
}

export function BikePanel(p: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState(p.trackedNumber ?? "");
  // Counts come from GBFS (live); the number list from the station scan (up to ~2 min old).
  const stationTotal = p.selectedStation ? p.selectedStation.bikes + p.selectedStation.ebikes : 0;
  const listedAvailable = p.stationBikes.filter((b) => b.available).length;
  useEffect(() => setQuery(p.bike?.number ?? p.trackedNumber ?? ""), [p.trackedNumber, p.bike?.number]);

  return (
    <div className="panel-body">
      <form
        className="bike-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) p.onSearch(query);
        }}
      >
        <label htmlFor="bike-q" className="sr-only">{t("bikeSearchPlaceholder")}</label>
        <input
          id="bike-q"
          className="mono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("bikeSearchPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
        />
        <button className="primary" type="submit">{t("find")}</button>
      </form>
      <button type="button" className="nearest-btn" onClick={p.onFindNearest} disabled={p.nearby.loading}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {p.nearby.loading ? t("findingNearest") : t("nearestBike")}
      </button>

      {p.nearby.error && <p className="notice notice-warn">{t(p.nearby.error === "location" ? "nearestNeedsLocation" : "nearestNone")}</p>}

      {p.nearby.places && p.nearby.places.length > 0 && (
        <ol className="nearby">
          {p.nearby.places.map((place, i) => (
            <li key={place.key}>
              <button type="button" onClick={() => p.onTrack(place.best.number)}>
                <span className="nearby-rank">{i + 1}</span>
                <span className="nearby-main">
                  <span className="nearby-title">
                    <b className="mono">{place.best.number}</b>
                    {place.best.type === "ebike" && place.best.battery != null && <span className="muted"> · {place.best.battery}%</span>}
                  </span>
                  <span className="nearby-where">
                    {place.station ? `${place.station.name} · ${t("bikesThere", { n: place.count })}` : t("outsideStation")}
                  </span>
                </span>
                <span className="nearby-walk">
                  <b>{place.minutes} min</b>
                  <span className="muted">{formatDistance(place.walk)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {!p.trackedNumber && !p.selectedStation && !p.nearby.places && <p className="hint">{t("bikeHint")}</p>}

      {p.trackedNumber && !p.nearby.places?.length && <TrackedCard {...p} />}

      {p.selectedStation && (
        <section className="card station-card">
          <header>
            <div>
              <span className="eyebrow">{t("station")}</span>
              <h2 className="stop-name">{p.selectedStation.name}</h2>
              <p className="stop-address">{p.selectedStation.address}</p>
            </div>
            <button type="button" className="icon-btn" onClick={p.onCloseStation} aria-label={t("close")}>×</button>
          </header>
          <p className="muted small">
            {t("stationBikes", { n: stationTotal })} ·{" "}
            {p.dockedUpdated ? t("numbersAt", { time: time(p.dockedUpdated) }) : t("numbersLoading")}
          </p>
          {p.dockedUpdated && listedAvailable !== stationTotal && (
            <p className="notice notice-warn">{t("numbersOutOfDate", { listed: listedAvailable, total: stationTotal })}</p>
          )}
          <BikeChips bikes={p.stationBikes} onPick={p.onTrack} selected={p.trackedNumber} />
          <div className="actions">
            <OpenInMevo target={{ kind: "station", id: p.selectedStation.id }} />
          </div>
        </section>
      )}
    </div>
  );
}
