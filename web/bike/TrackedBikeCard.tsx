import { useRef, useState } from "react";
import type { Bike, Station } from "@shared/types";
import { useAllBikes, useStationsData } from "@/api";
import { useI18n } from "@/i18n";
import { formatDistance, haversine } from "@/lib/geo";
import { stationPos, walkingDirectionsUrl } from "@/lib/planner";
import { useBikeStore } from "@/store/bike";
import { Actions, Button, Card, cx, Pill } from "@/ui";
import { OpenInMevo } from "./OpenInMevo";
import { useTrackedBike } from "./actions";

const DT = "text-[12px] font-semibold uppercase tracking-[0.06em] text-muted pt-0.5";
const DD = "m-0 min-w-0 tabular-nums";
const NOTE = "block text-muted text-[12.5px]";

function nearestStation(stations: Station[], b: Bike) {
  let best: { station: Station; distance: number } | null = null;
  for (const station of stations) {
    const distance = haversine([b.lat, b.lon], stationPos(station));
    if (!best || distance < best.distance) best = { station, distance };
  }
  return best;
}

export function TrackedBikeCard() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const { number, bike } = useTrackedBike();
  // Remember where the bike stood, so a bike that just left on a trip reads "riding", not "not found".
  const lastSeen = useRef<Bike | null>(null);
  if (bike) lastSeen.current = bike;
  else if (lastSeen.current && lastSeen.current.number.toLowerCase() !== number) lastSeen.current = null;
  const { stations, byId } = useStationsData();
  const { dockedLoaded } = useAllBikes();
  const onUntrack = () => useBikeStore.getState().setTracked(null);
  if (!number) return null;
  const station = bike?.stationId ? byId.get(bike.stationId) : null;
  const near = bike && !station ? nearestStation(stations, bike) : null;
  const where = bike ?? lastSeen.current;

  const status = bike
    ? bike.available
      ? { text: t(station ? "statusAtStation" : "statusFree"), tone: "ok" as const }
      : { text: t("statusUnavailable"), tone: "warn" as const }
    : !dockedLoaded
      ? { text: t("statusLoading"), tone: "warn" as const }
      : { text: t(lastSeen.current ? "statusRiding" : "statusNotFound"), tone: "gone" as const };

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
    <Card live>
      <Pill tone={status.tone}>{status.text}</Pill>
      <h2 className="m-0 font-mono font-extrabold text-[34px]/none tracking-[0.02em]">{where?.number ?? number}</h2>
      {bike ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-[7px] m-0">
          <dt className={DT}>{t("type")}</dt>
          <dd className={DD}>{t(bike.type)}</dd>
          {bike.type === "ebike" && bike.battery != null && (
            <>
              <dt className={DT}>{t("battery")}</dt>
              <dd className={cx(DD, "flex items-center gap-2.5")}>
                <span className="w-[90px] h-[9px] rounded-[5px] bg-line overflow-hidden"><i className="block h-full bg-ebike rounded-[5px]" style={{ width: `${bike.battery}%` }} /></span>
                {bike.battery}%{bike.range != null && ` · ~${Math.round(bike.range / 1000)} km`}
              </dd>
            </>
          )}
          {station ? (
            <>
              <dt className={DT}>{t("station")}</dt>
              <dd className={DD}>
                <b>{station.name}</b>
                <small className={NOTE}>{station.address}</small>
              </dd>
            </>
          ) : (
            <>
              <dt className={DT}>{t("outsideStation")}</dt>
              <dd className={DD}>
                {near && (
                  <>
                    {t("nearStation")}: <b>{near.station.name}</b>, {formatDistance(near.distance)}
                    <small className={NOTE}>{near.station.address}</small>
                  </>
                )}
              </dd>
            </>
          )}
        </dl>
      ) : (
        dockedLoaded && <p className="text-muted">{t("notFoundHint")}</p>
      )}
      <Actions>
        {bike && (
          <OpenInMevo target={bike.appId ? { kind: "vehicle", id: bike.appId } : bike.stationId ? { kind: "station", id: bike.stationId } : { kind: "app" }} />
        )}
        {where && (
          <Button href={walkingDirectionsUrl([where.lat, where.lon])} external>
            {t("walkThere")}
          </Button>
        )}
        <Button variant="ghost" onClick={copy}>{copied ? t("copied") : t("copyNumber")}</Button>
        <Button variant="ghost" onClick={onUntrack}>{t("stopTracking")}</Button>
      </Actions>
    </Card>
  );
}
