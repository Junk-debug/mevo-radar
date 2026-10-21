import { useMemo } from "react";
import { Actions, Card, IconButton, Notice, StopTitle } from "@/components/ui";
import { useTrackBike } from "@/hooks/useTrackBike";
import { useI18n } from "@/i18n";
import { useAllBikes, useStationsData } from "@/services/api";
import { useBikeStore } from "@/store/bike";
import { BikeChips } from "./BikeChips";
import { OpenInMevo } from "./OpenInMevo";

const clock = (unix: number) => new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function StationCard() {
  const { t } = useI18n();
  const stationId = useBikeStore((s) => s.stationId);
  const selectedNumber = useBikeStore((s) => s.trackedNumber);
  const { byId } = useStationsData();
  const { list, numbersUpdated } = useAllBikes();
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
  // Counts come from GBFS, the number list from the live per-station query (polled every 15 s).
  const updated = numbersUpdated(station.id);
  const total = station.classicBikes + station.ebikes;
  const listed = bikes.filter((b) => b.available).length;

  return (
    <Card>
      <header className="flex justify-between gap-2.5 items-start">
        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{t("station")}</span>
          <StopTitle as="h2" name={station.name} address={station.address} />
        </div>
        <IconButton icon="close" label={t("close")} onClick={onClose} />
      </header>
      <p className="m-0 text-muted text-[13px]">
        {t("stationBikes", { n: total })} · {updated ? t("numbersAt", { time: clock(updated) }) : t("numbersLoading")}
      </p>
      {updated && listed !== total && <Notice tone="warn">{t("numbersOutOfDate", { listed, total })}</Notice>}
      <BikeChips bikes={bikes} onPick={onPick} selected={selectedNumber} />
      <Actions>
        <OpenInMevo target={{ kind: "station", id: station.id }} />
      </Actions>
    </Card>
  );
}
