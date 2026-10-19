import { useI18n } from "@/i18n";
import { formatDistance } from "@/lib/geo";
import { useBikeStore } from "@/store/bike";
import { useTrackBike } from "./actions";

export function NearbyList() {
  const { t } = useI18n();
  const places = useBikeStore((s) => s.nearby.places) ?? [];
  const onPick = useTrackBike();
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
