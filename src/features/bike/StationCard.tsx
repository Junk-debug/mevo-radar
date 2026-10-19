import type { Bike, Station } from "../../../shared/types";
import { OpenInMevo } from "../../components/OpenInMevo";
import { useI18n } from "../../i18n";
import { BikeChips } from "./BikeChips";

interface Props {
  station: Station;
  bikes: Bike[];
  dockedUpdated: number | null;
  selectedNumber: string | null;
  onPick: (number: string) => void;
  onClose: () => void;
}

const clock = (unix: number) => new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function StationCard({ station, bikes, dockedUpdated, selectedNumber, onPick, onClose }: Props) {
  const { t } = useI18n();
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
