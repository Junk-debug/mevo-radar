import { useI18n } from "../../i18n";
import { formatDistance } from "../../lib/geo";
import type { NearbyPlace } from "../../lib/nearest";

export function NearbyList({ places, onPick }: { places: NearbyPlace[]; onPick: (number: string) => void }) {
  const { t } = useI18n();
  return (
    <ol className="nearby">
      {places.map((place, i) => (
        <li key={place.key}>
          <button type="button" onClick={() => onPick(place.best.number)}>
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
  );
}
