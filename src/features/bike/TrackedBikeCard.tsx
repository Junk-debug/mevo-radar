import { useState } from "react";
import type { Bike, Station } from "../../../shared/types";
import { OpenInMevo } from "../../components/OpenInMevo";
import { useI18n } from "../../i18n";
import { formatDistance, haversine } from "../../lib/geo";
import { stationPos, walkingDirectionsUrl } from "../../lib/planner";

interface Props {
  number: string;
  bike: Bike | null;
  lastSeen: Bike | null;
  dockedLoaded: boolean;
  stations: Station[];
  stationsById: Map<string, Station>;
  onUntrack: () => void;
}

function nearestStation(stations: Station[], b: Bike) {
  let best: { station: Station; distance: number } | null = null;
  for (const station of stations) {
    const distance = haversine([b.lat, b.lon], stationPos(station));
    if (!best || distance < best.distance) best = { station, distance };
  }
  return best;
}

export function TrackedBikeCard({ number, bike, lastSeen, dockedLoaded, stations, stationsById, onUntrack }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const station = bike?.stationId ? stationsById.get(bike.stationId) : null;
  const near = bike && !station ? nearestStation(stations, bike) : null;
  const where = bike ?? lastSeen;

  const status = bike
    ? bike.available
      ? { text: t(station ? "statusAtStation" : "statusFree"), tone: "ok" }
      : { text: t("statusUnavailable"), tone: "warn" }
    : !dockedLoaded
      ? { text: t("statusLoading"), tone: "warn" }
      : { text: t(lastSeen ? "statusRiding" : "statusNotFound"), tone: "gone" };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bike?.number ?? number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; the number is visible on screen anyway
    }
  };

  return (
    <section className="card tracked" aria-live="polite">
      <span className={`pill pill-${status.tone}`}>{status.text}</span>
      <h2 className="bike-number">{bike?.number ?? lastSeen?.number ?? number}</h2>
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
                    {t("nearStation")}: <b>{near.station.name}</b>, {formatDistance(near.distance)}
                    <small>{near.station.address}</small>
                  </>
                )}
              </dd>
            </>
          )}
        </dl>
      ) : (
        dockedLoaded && <p className="muted">{t("notFoundHint")}</p>
      )}
      <div className="actions">
        {bike && (
          <OpenInMevo target={bike.appId ? { kind: "vehicle", id: bike.appId } : bike.stationId ? { kind: "station", id: bike.stationId } : { kind: "app" }} />
        )}
        {where && (
          <a className="btn" href={walkingDirectionsUrl([where.lat, where.lon])} target="_blank" rel="noopener">
            {t("walkThere")}
          </a>
        )}
        <button type="button" className="btn ghost" onClick={copy}>{copied ? t("copied") : t("copyNumber")}</button>
        <button type="button" className="btn ghost" onClick={onUntrack}>{t("stopTracking")}</button>
      </div>
    </section>
  );
}
