import { useTrackBike } from "@/hooks/useTrackBike";
import { useI18n } from "@/i18n";
import { useBikeStore } from "@/store/bike";
import { formatDistance } from "@/utils/geo";

export function NearbyList() {
  const { t } = useI18n();
  const places = useBikeStore((s) => s.nearby.places) ?? [];
  const onPick = useTrackBike();
  return (
    <ol className="list-none m-0 p-0 grid gap-1.5">
      {places.map((place, i) => (
        <li key={place.key}>
          <button
            type="button"
            className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 border-0 rounded-md bg-surface-2 text-left hover:shadow-[inset_0_0_0_1px_var(--line)]"
            onClick={() => onPick(place.bestBike.number)}
          >
            <span className="size-6 rounded-full grid place-items-center bg-ink text-surface font-display font-extrabold text-[11px]/[normal]">{i + 1}</span>
            <span className="grid min-w-0">
              <span>
                <b className="font-mono text-[15px]">{place.bestBike.number}</b>
                {place.bestBike.type === "ebike" && place.bestBike.battery != null && <span className="text-muted"> · {place.bestBike.battery}%</span>}
              </span>
              <span className="text-[12.5px] text-muted truncate">
                {place.station ? `${place.station.name} · ${t("bikesThere", { n: place.count })}` : t("outsideStation")}
              </span>
            </span>
            <span className="grid justify-items-end text-[12px]">
              <b className="text-[15px]">{place.minutes} min</b>
              <span className="text-muted">{formatDistance(place.walkDistance)}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
