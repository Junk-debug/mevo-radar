import { useMemo } from "react";
import { useAllBikes, useStations } from "../api";
import { useI18n } from "../i18n";

export function useAppData() {
  const { t } = useI18n();
  const stationsQuery = useStations();
  const all = useAllBikes();

  return useMemo(() => {
    const stations = stationsQuery.data?.stations ?? [];
    const freeBikes = all.list.filter((b) => !b.stationId);
    const totalBikes = stations.reduce((n, s) => n + s.bikes + s.ebikes, 0) + freeBikes.length;
    return {
      stations,
      stationsById: new Map(stations.map((s) => [s.id, s])),
      all,
      freeBikes,
      online: !stationsQuery.isError && !all.error,
      summary: stations.length ? t("stationsCount", { s: stations.length, b: totalBikes }) : "…",
    };
  }, [stationsQuery.data, stationsQuery.isError, all, t]);
}

export type AppData = ReturnType<typeof useAppData>;
