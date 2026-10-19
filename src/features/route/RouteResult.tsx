import type { Station } from "../../../shared/types";
import { OpenInMevo } from "../../components/OpenInMevo";
import { useI18n } from "../../i18n";
import { formatDistance, formatDuration } from "../../lib/geo";
import { bikesAt, googleMapsUrl, LOW_COUNT, type BikePreference, type TripPlan } from "../../lib/planner";
import { useTrackBike } from "../bike/actions";
import { BikeChips } from "../bike/BikeChips";

interface Props {
  plan: TripPlan;
  pref: BikePreference;
}

const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));
const clock = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function StationCounts({ station }: { station: Station }) {
  const { t } = useI18n();
  return (
    <span className="counts">
      <span><b>{station.ebikes}</b> {t("ebikesShort")}</span>
      <span><b>{station.bikes}</b> {t("bikesShort")}</span>
      <span><b>{station.docks}</b> {t("freeDocks")}</span>
    </span>
  );
}

function LegBar({ plan }: { plan: TripPlan }) {
  const { t } = useI18n();
  const total = plan.legs.reduce((s, l) => s + l.duration, 0);
  const label = plan.legs.map((l) => `${t(l.mode === "walk" ? "walk" : "ride")} ${formatDuration(l.duration)}`).join(", ");
  return (
    <div className="legbar" role="img" aria-label={label}>
      {plan.legs.map((l, i) => (
        <span key={i} className={`legbar-${l.mode}`} style={{ flexGrow: Math.max(l.duration, total * 0.08) }}>
          {formatDuration(l.duration)}
        </span>
      ))}
    </div>
  );
}

function Steps({ plan }: { plan: TripPlan }) {
  const { t } = useI18n();
  const [walkIn, ride, walkOut] = plan.legs;
  const leg = (l: typeof walkIn) => `${formatDistance(l.distance)} · ${formatDuration(l.duration)}`;
  return (
    <ol className="steps">
      <li className="step step-walk"><span className="step-label">{t("walk")}</span><span className="step-meta">{leg(walkIn)}</span></li>
      <li className="step step-stop">
        {plan.pickup.kind === "station" ? (
          <>
            <h3 className="stop-name">{plan.pickup.station.name}</h3>
            <p className="stop-address">{plan.pickup.station.address}</p>
            <StationCounts station={plan.pickup.station} />
          </>
        ) : (
          <h3 className="stop-name">{plan.pickup.bike.number}</h3>
        )}
      </li>
      <li className="step step-ride"><span className="step-label">{t("ride")}</span><span className="step-meta">{leg(ride)}</span></li>
      <li className="step step-stop">
        <h3 className="stop-name">{plan.dropoff.name}</h3>
        <p className="stop-address">{plan.dropoff.address}</p>
        <StationCounts station={plan.dropoff} />
      </li>
      <li className="step step-walk"><span className="step-label">{t("walk")}</span><span className="step-meta">{leg(walkOut)}</span></li>
    </ol>
  );
}

export function RouteResult({ plan, pref }: Props) {
  const { t } = useI18n();
  const onBike = useTrackBike();
  const { pickup, dropoff, legs } = plan;
  const total = legs.reduce((s, l) => s + l.duration, 0);
  const walkToBike = minutes(legs[0].duration);
  const pickupCount = pickup.kind === "station" ? bikesAt(pickup.station, pref) : null;

  return (
    <section className="result" aria-live="polite">
      <div className="summary">
        <span className="summary-time">{formatDuration(total)}</span>
        <span className="summary-meta">
          {t("arriveAt", { time: clock(new Date(Date.now() + total * 1000)) })} · {formatDistance(legs.reduce((s, l) => s + l.distance, 0))}
        </span>
      </div>
      <LegBar plan={plan} />

      <div className="card pickup">
        {pickup.kind === "station" ? (
          <>
            <strong className="pickup-title">{t("pickupAt", { name: pickup.station.name })}</strong>
            <span className="muted small">{t("pickupMeta", { min: walkToBike, n: pickupCount ?? 0 })}</span>
            {pickup.bikes.length > 0 && <BikeChips bikes={pickup.bikes} onPick={onBike} />}
            {pickupCount !== null && pickupCount <= LOW_COUNT && <p className="notice notice-warn">{t("lowBikes", { n: pickupCount })}</p>}
          </>
        ) : (
          <>
            <strong className="pickup-title">{t("pickupFreeBike", { number: pickup.bike.number })}</strong>
            <span className="muted small">{t("freeBikeMeta", { min: walkToBike })}</span>
          </>
        )}
        <div className="actions">
          <OpenInMevo
            target={
              pickup.kind === "station"
                ? { kind: "station", id: pickup.station.id }
                : pickup.bike.appId
                  ? { kind: "vehicle", id: pickup.bike.appId }
                  : { kind: "app" }
            }
          />
          <a className="btn ghost" href={googleMapsUrl(plan)} target="_blank" rel="noopener">{t("openInGoogle")}</a>
        </div>
      </div>

      <div className="dropoff">
        <span>
          <strong>{t("dropoffAt", { name: dropoff.name })}</strong>
          <span className="muted small"> · {t("dropoffMeta", { n: dropoff.docks })}</span>
        </span>
        {dropoff.docks <= LOW_COUNT && (
          <p className="notice notice-warn">
            {plan.dropoffAlternative
              ? t("lowDocks", { n: dropoff.docks, alt: plan.dropoffAlternative.name, docks: plan.dropoffAlternative.docks })
              : t("lowDocksNoAlt", { n: dropoff.docks })}
          </p>
        )}
      </div>

      {plan.closerFreeBike && (
        <button type="button" className="notice notice-tip" onClick={() => onBike(plan.closerFreeBike!.bike.number)}>
          {t("closerFreeBike", { number: plan.closerFreeBike.bike.number, dist: formatDistance(plan.closerFreeBike.distance) })}
        </button>
      )}

      <details className="details">
        <summary>{t("routeDetails")}</summary>
        <Steps plan={plan} />
      </details>
    </section>
  );
}
