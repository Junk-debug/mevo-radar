import type { Station } from "../../shared/types";
import { useI18n } from "../i18n";
import { formatDistance, formatDuration } from "../lib/geo";
import { bikesAt, googleMapsUrl, LOW_COUNT, type BikePreference, type TripPlan } from "../lib/planner";
import { BikeChips } from "./BikeChips";
import { OpenInMevo } from "./OpenInMevo";
import { PlaceInput, type PlaceValue } from "./PlaceInput";

export type PlanStatus = "idle" | "loading" | "noBikes" | "noDocks" | "failed" | "needBoth";

interface Props {
  from: PlaceValue | null;
  to: PlaceValue | null;
  onFrom: (v: PlaceValue | null) => void;
  onTo: (v: PlaceValue | null) => void;
  onActiveField: (f: "from" | "to") => void;
  pref: BikePreference;
  onPref: (p: BikePreference) => void;
  plan: TripPlan | null;
  status: PlanStatus;
  onPlan: () => void;
  onBike: (number: string) => void;
}

function StationCounts({ s }: { s: Station }) {
  const { t } = useI18n();
  return (
    <span className="counts">
      <span><b>{s.ebikes}</b> {t("ebikesShort")}</span>
      <span><b>{s.bikes}</b> {t("bikesShort")}</span>
      <span><b>{s.docks}</b> {t("freeDocks")}</span>
    </span>
  );
}

function Summary({ plan }: { plan: TripPlan }) {
  const { t } = useI18n();
  const total = plan.legs.reduce((s, l) => s + l.duration, 0);
  return (
    <div className="summary">
      <div className="summary-head">
        <span className="summary-time">{formatDuration(total)}</span>
        <span className="summary-dist">{formatDistance(plan.legs.reduce((s, l) => s + l.distance, 0))}</span>
      </div>
      <div className="legbar" role="img" aria-label={plan.legs.map((l) => `${t(l.mode === "walk" ? "walk" : "ride")} ${formatDuration(l.duration)}`).join(", ")}>
        {plan.legs.map((l, i) => (
          <span key={i} className={`legbar-${l.mode}`} style={{ flexGrow: Math.max(l.duration, total * 0.08) }}>
            {formatDuration(l.duration)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RoutePanel(p: Props) {
  const { t } = useI18n();
  const { plan } = p;
  const pickupCount = plan?.pickup.kind === "station" ? bikesAt(plan.pickup.station, p.pref) : null;
  const message = p.status !== "idle" && p.status !== "loading"
    ? t(p.status === "failed" ? "routeFailed" : p.status)
    : null;

  return (
    <div className="panel-body">
      <form
        className="route-form"
        onSubmit={(e) => {
          e.preventDefault();
          p.onPlan();
        }}
      >
        <div className="places">
          <PlaceInput label={t("from")} marker="from" value={p.from} onChange={p.onFrom} onFocus={() => p.onActiveField("from")} withLocate />
          <PlaceInput label={t("to")} marker="to" value={p.to} onChange={p.onTo} onFocus={() => p.onActiveField("to")} />
          <button
            type="button"
            className="swap"
            title={t("swap")}
            aria-label={t("swap")}
            onClick={() => {
              p.onFrom(p.to);
              p.onTo(p.from);
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="hint">{t("pickOnMap")}</p>
        <div className="segmented" role="radiogroup" aria-label={t("type")}>
          {(["any", "ebike", "bike"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={p.pref === v}
              className={p.pref === v ? "on" : ""}
              onClick={() => p.onPref(v)}
            >
              {t(v === "any" ? "prefAny" : v === "ebike" ? "prefEbike" : "prefBike")}
            </button>
          ))}
        </div>
        <button className="primary" type="submit" disabled={p.status === "loading"}>
          {p.status === "loading" ? t("searching") : t("findRoute")}
        </button>
      </form>

      {message && <p className="notice notice-error" role="alert">{message}</p>}

      {plan && p.status === "idle" && (
        <section className="result" aria-live="polite">
          <Summary plan={plan} />

          <ol className="steps">
            <li className="step step-walk">
              <span className="step-label">{t("walk")}</span>
              <span className="step-meta">{formatDistance(plan.legs[0].distance)} · {formatDuration(plan.legs[0].duration)}</span>
            </li>

            <li className="step step-stop step-pickup">
              <span className="step-label">{plan.pickup.kind === "station" ? t("pickupStation") : t("pickupFreeBike")}</span>
              {plan.pickup.kind === "station" ? (
                <>
                  <h3 className="stop-name">{plan.pickup.station.name}</h3>
                  <p className="stop-address">{plan.pickup.station.address}</p>
                  <StationCounts s={plan.pickup.station} />
                  {plan.pickup.bikes.length > 0 && <BikeChips bikes={plan.pickup.bikes} onPick={p.onBike} />}
                  {pickupCount !== null && pickupCount <= LOW_COUNT && (
                    <p className="notice notice-warn">{t("lowBikes", { n: pickupCount })}</p>
                  )}
                  <OpenInMevo target={{ kind: "station", id: plan.pickup.station.id }} className="btn mevo mevo-inline" />
                </>
              ) : (
                <>
                  <h3 className="stop-name mono">{plan.pickup.bike.number}</h3>
                  <BikeChips bikes={[plan.pickup.bike]} onPick={p.onBike} />
                  <OpenInMevo
                    target={plan.pickup.bike.appId ? { kind: "vehicle", id: plan.pickup.bike.appId } : { kind: "app" }}
                    className="btn mevo mevo-inline"
                  />
                </>
              )}
            </li>

            <li className="step step-ride">
              <span className="step-label">{t("ride")}</span>
              <span className="step-meta">{formatDistance(plan.legs[1].distance)} · {formatDuration(plan.legs[1].duration)}</span>
            </li>

            <li className="step step-stop step-dropoff">
              <span className="step-label">{t("dropoffStation")}</span>
              <h3 className="stop-name">{plan.dropoff.name}</h3>
              <p className="stop-address">{plan.dropoff.address}</p>
              <StationCounts s={plan.dropoff} />
              {plan.dropoff.docks <= LOW_COUNT && (
                <p className="notice notice-warn">
                  {plan.dropoffAlternative
                    ? t("lowDocks", { n: plan.dropoff.docks, alt: plan.dropoffAlternative.name, docks: plan.dropoffAlternative.docks })
                    : t("lowDocksNoAlt", { n: plan.dropoff.docks })}
                </p>
              )}
            </li>

            <li className="step step-walk">
              <span className="step-label">{t("walk")}</span>
              <span className="step-meta">{formatDistance(plan.legs[2].distance)} · {formatDuration(plan.legs[2].duration)}</span>
            </li>
          </ol>

          {plan.closerFreeBike && (
            <button type="button" className="notice notice-tip" onClick={() => p.onBike(plan.closerFreeBike!.bike.number)}>
              {t("closerFreeBike", { number: plan.closerFreeBike.bike.number, dist: formatDistance(plan.closerFreeBike.distance) })}
            </button>
          )}

          <a className="primary link-btn" href={googleMapsUrl(plan)} target="_blank" rel="noopener">
            {t("openInGoogle")}
          </a>
        </section>
      )}
    </div>
  );
}

