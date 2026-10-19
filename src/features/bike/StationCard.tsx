import { useMemo } from "react";
import { useAllBikes, useStationsData } from "../../api";
import { OpenInMevo } from "../../components/OpenInMevo";
import { useI18n } from "../../i18n";
import { useBikeStore } from "../../store/bike";
import { useTrackBike } from "./actions";
import { BikeChips } from "./BikeChips";

const clock = (unix: number) => new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function StationCard() {
  const { t } = useI18n();
  const stationId = useBikeStore((s) => s.stationId);
  const selectedNumber = useBikeStore((s) => s.tracked);
  const { byId } = useStationsData();
  const { list, dockedUpdated } = useAllBikes();
  const onPick = useTrackBike();
  const onClose = () => useBikeStore.getState().selectStation(null);
  const bikes = useMemo(
    () =>
      list
        .filter((b) => b.stationId === stationId)
        .sort((a, b) => Number(b.available) - Number(a.available) || (b.battery ?? -1) - (a.battery ?? -1)),
    [list, stationId],
  );
  const station = stationId ? byId.get(stationId) : undefined;
  if (!station) return null;
  // Counts are live (GBFS); the number list comes from the station scan, up to ~2 min old.
  const total = station.bikes + station.ebikes;
  const listed = bikes.filter((b) => b.available).length;

  return (
    <section className="card station-card">
      <header>
        <div>
          <span className="eyebrow">{t("station")}</span>
          <h2 className="stop-name">{station.name}</h2>
          <p className="stop-address">{station.address}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t("close")}>×</button>
      </header>
      <p className="muted small">
        {t("stationBikes", { n: total })} · {dockedUpdated ? t("numbersAt", { time: clock(dockedUpdated) }) : t("numbersLoading")}
      </p>
      {dockedUpdated && listed !== total && <p className="notice notice-warn">{t("numbersOutOfDate", { listed, total })}</p>}
      <BikeChips bikes={bikes} onPick={onPick} selected={selectedNumber} />
      <div className="actions">
        <OpenInMevo target={{ kind: "station", id: station.id }} />
      </div>
    </section>
  );
}
