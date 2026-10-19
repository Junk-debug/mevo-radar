import { useEffect, useState } from "react";
import { Button, Notice } from "@/components/ui";
import { useTrackBike } from "@/hooks/useTrackBike";
import { useTrackedBike } from "@/hooks/useTrackedBike";
import { useI18n } from "@/i18n";
import { useBikeStore } from "@/store/bike";
import { useUi } from "@/store/ui";
import { NearbyList } from "./NearbyList";
import { StationCard } from "./StationCard";
import { TrackedBikeCard } from "./TrackedBikeCard";
import { useFindNearest } from "./useFindNearest";

export function BikePanel() {
  const { t } = useI18n();
  const { number, bike } = useTrackedBike();
  const nearby = useBikeStore((s) => s.nearby);
  const stationId = useBikeStore((s) => s.stationId);
  const track = useTrackBike();
  const findNearest = useFindNearest();
  const [query, setQuery] = useState(number ?? "");
  useEffect(() => setQuery(bike?.number ?? number ?? ""), [number, bike?.number]);
  const showingNearby = !!nearby.places?.length;

  // When the panel is about the tracked bike, the map shows it too: on opening the tab, on picking
  // another bike, and when a link's bike first appears in the data. A station or a nearby search
  // owns the camera instead.
  const aboutBike = !showingNearby && !nearby.loading && !stationId;
  const shownNumber = aboutBike ? (bike?.number ?? null) : null;
  useEffect(() => {
    if (bike && shownNumber) useUi.getState().focusOn([bike.lat, bike.lon]);
  }, [shownNumber]);

  return (
    <>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) track(query);
        }}
      >
        <label htmlFor="bike-q" className="sr-only">{t("bikeSearchPlaceholder")}</label>
        <input
          id="bike-q"
          className="flex-1 min-w-0 px-3.5 py-3 border border-line rounded-md bg-surface-2 font-mono text-[16px] lowercase"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("bikeSearchPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
        />
        <Button variant="primary" type="submit">{t("find")}</Button>
      </form>

      <Button variant="outline" fullWidth icon="target" className="[&_svg]:text-me" onClick={findNearest} disabled={nearby.loading}>
        {nearby.loading ? t("findingNearest") : t("nearestBike")}
      </Button>

      {nearby.error && <Notice tone="warn">{t(nearby.error === "location" ? "nearestNeedsLocation" : "nearestNone")}</Notice>}
      {showingNearby && <NearbyList />}
      {!number && !stationId && !showingNearby && <p className="mt-[-4px] mx-0 mb-0 text-muted text-[13px]">{t("bikeHint")}</p>}
      {number && !showingNearby && <TrackedBikeCard />}
      {stationId && <StationCard />}
    </>
  );
}
