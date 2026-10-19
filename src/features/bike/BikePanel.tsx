import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { useBikeStore } from "../../store/bike";
import { useFindNearest, useTrackBike, useTrackedBike } from "./actions";
import { NearbyList } from "./NearbyList";
import { StationCard } from "./StationCard";
import { TrackedBikeCard } from "./TrackedBikeCard";
import "./bike.css";

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

  return (
    <div className="panel-body">
      <form
        className="bike-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) track(query);
        }}
      >
        <label htmlFor="bike-q" className="sr-only">{t("bikeSearchPlaceholder")}</label>
        <input
          id="bike-q"
          className="mono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("bikeSearchPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
        />
        <button className="primary" type="submit">{t("find")}</button>
      </form>

      <button type="button" className="nearest-btn" onClick={findNearest} disabled={nearby.loading}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {nearby.loading ? t("findingNearest") : t("nearestBike")}
      </button>

      {nearby.error && <p className="notice notice-warn">{t(nearby.error === "location" ? "nearestNeedsLocation" : "nearestNone")}</p>}
      {showingNearby && <NearbyList />}
      {!number && !stationId && !showingNearby && <p className="hint">{t("bikeHint")}</p>}
      {number && !showingNearby && <TrackedBikeCard />}
      {stationId && <StationCard />}
    </div>
  );
}
