import { useEffect, useState } from "react";
import type { Bike, Station } from "../../../shared/types";
import { useI18n } from "../../i18n";
import { NearbyList } from "./NearbyList";
import { StationCard } from "./StationCard";
import { TrackedBikeCard } from "./TrackedBikeCard";
import type { NearbyState } from "./useNearby";
import "./bike.css";

interface Props {
  tracked: { number: string | null; bike: Bike | null; lastSeen: Bike | null };
  nearby: NearbyState;
  station: Station | null;
  stationBikes: Bike[];
  stations: Station[];
  stationsById: Map<string, Station>;
  dockedLoaded: boolean;
  dockedUpdated: number | null;
  onTrack: (number: string) => void;
  onUntrack: () => void;
  onFindNearest: () => void;
  onCloseStation: () => void;
}

export function BikePanel(p: Props) {
  const { t } = useI18n();
  const { number, bike, lastSeen } = p.tracked;
  const [query, setQuery] = useState(number ?? "");
  useEffect(() => setQuery(bike?.number ?? number ?? ""), [number, bike?.number]);
  const showingNearby = !!p.nearby.places?.length;

  return (
    <div className="panel-body">
      <form
        className="bike-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) p.onTrack(query);
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

      <button type="button" className="nearest-btn" onClick={p.onFindNearest} disabled={p.nearby.loading}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {p.nearby.loading ? t("findingNearest") : t("nearestBike")}
      </button>

      {p.nearby.error && <p className="notice notice-warn">{t(p.nearby.error === "location" ? "nearestNeedsLocation" : "nearestNone")}</p>}
      {showingNearby && <NearbyList places={p.nearby.places!} onPick={p.onTrack} />}
      {!number && !p.station && !showingNearby && <p className="hint">{t("bikeHint")}</p>}

      {number && !showingNearby && (
        <TrackedBikeCard
          number={number}
          bike={bike}
          lastSeen={lastSeen}
          dockedLoaded={p.dockedLoaded}
          stations={p.stations}
          stationsById={p.stationsById}
          onUntrack={p.onUntrack}
        />
      )}

      {p.station && (
        <StationCard
          station={p.station}
          bikes={p.stationBikes}
          dockedUpdated={p.dockedUpdated}
          selectedNumber={number}
          onPick={p.onTrack}
          onClose={p.onCloseStation}
        />
      )}
    </div>
  );
}
