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
          <button type="button" onClick={() => onPick(place.bestBike.number)}>
            <span className="nearby-rank">{i + 1}</span>
            <span className="nearby-main">
              <span className="nearby-title">
                <b className="mono">{place.bestBike.number}</b>
                {place.bestBike.type === "ebike" && place.bestBike.battery != null && <span className="muted"> · {place.bestBike.battery}%</span>}
              </span>
              <span className="nearby-where">
                {place.station ? `${place.station.name} · ${t("bikesThere", { n: place.count })}` : t("outsideStation")}
              </span>
            </span>
            <span className="nearby-walk">
              <b>{place.minutes} min</b>
              <span className="muted">{formatDistance(place.walkDistance)}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
