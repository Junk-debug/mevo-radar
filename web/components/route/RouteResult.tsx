import type { Station } from "@shared/types";
import { BikeChips } from "@/components/bike/BikeChips";
import { OpenInMevo } from "@/components/bike/OpenInMevo";
import { Actions, Button, Card, cx, Notice, StopTitle } from "@/components/ui";
import { useTrackBike } from "@/hooks/useTrackBike";
import { useI18n } from "@/i18n";
import { bikesAt, googleMapsUrl, LOW_STOCK_LIMIT, type BikePreference, type TripPlan } from "@/services/planner";
import { formatDistance, formatDuration } from "@/utils/geo";

interface Props {
  plan: TripPlan;
  pref: BikePreference;
}

const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));
const clock = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const LEG: Record<TripPlan["legs"][number]["mode"], string> = {
  walk: "bg-surface-2 text-muted border border-dashed border-line",
  bike: "bg-accent text-accent-ink",
};

// Steps hang on a vertical line drawn by ::before (dotted for walking, solid for riding);
// stops get a ring on the line from ::after.
const STEP_LINE = "relative before:content-[''] before:absolute before:left-[-16px] before:top-0 before:bottom-[-4px] last:before:bottom-1/2";
const STEP = {
  walk: cx(STEP_LINE, "py-1.5 before:[border-left:3px_dotted_var(--muted)]"),
  ride: cx(STEP_LINE, "py-1.5 before:[border-left:3px_solid_var(--accent)]"),
  stop: cx(
    STEP_LINE,
    "before:[border-left:3px_dotted_var(--muted)] grid gap-1.5 my-0.5 pt-2 px-3 pb-3 rounded-md bg-surface-2",
    "after:content-[''] after:absolute after:left-[-22px] after:top-2 after:size-[15px] after:rounded-full after:bg-surface after:[border:3px_solid_var(--accent)]",
  ),
};
const STEP_LABEL = "text-[12px] font-semibold uppercase tracking-[0.06em] text-muted";
const STEP_META = "ml-2 font-mono text-[12.5px]";
const MUTED_SMALL = "text-muted text-[13px]";

function StationCounts({ station }: { station: Station }) {
  const { t } = useI18n();
  return (
    <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-muted [&_b]:text-ink [&_b]:tabular-nums">
      <span><b>{station.ebikes}</b> {t("ebikesShort")}</span>
      <span><b>{station.classicBikes}</b> {t("bikesShort")}</span>
      <span><b>{station.freeDocks}</b> {t("freeDocks")}</span>
    </span>
  );
}

function LegBar({ plan }: { plan: TripPlan }) {
  const { t } = useI18n();
  const total = plan.legs.reduce((s, l) => s + l.duration, 0);
  const label = plan.legs.map((l) => `${t(l.mode === "walk" ? "walk" : "ride")} ${formatDuration(l.duration)}`).join(", ");
  return (
    <div className="flex gap-[3px] h-[26px]" role="img" aria-label={label}>
      {plan.legs.map((l, i) => (
        <span
          key={i}
          className={cx("grid place-items-center min-w-0 overflow-hidden whitespace-nowrap rounded-[6px] px-1.5 font-mono font-semibold text-[11px]/[normal]", LEG[l.mode])}
          style={{ flexGrow: Math.max(l.duration, total * 0.08) }}>
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
    <ol className="list-none m-0 pl-[22px] grid gap-1">
      <li className={STEP.walk}><span className={STEP_LABEL}>{t("walk")}</span><span className={STEP_META}>{leg(walkIn)}</span></li>
      <li className={STEP.stop}>
        {plan.pickup.kind === "station" ? (
          <>
            <StopTitle as="h3" name={plan.pickup.station.name} address={plan.pickup.station.address} />
            <StationCounts station={plan.pickup.station} />
          </>
        ) : (
          <StopTitle as="h3" name={plan.pickup.bike.number} />
        )}
      </li>
      <li className={STEP.ride}><span className={STEP_LABEL}>{t("ride")}</span><span className={STEP_META}>{leg(ride)}</span></li>
      <li className={STEP.stop}>
        <StopTitle as="h3" name={plan.dropoff.name} address={plan.dropoff.address} />
        <StationCounts station={plan.dropoff} />
      </li>
      <li className={STEP.walk}><span className={STEP_LABEL}>{t("walk")}</span><span className={STEP_META}>{leg(walkOut)}</span></li>
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
    <section className="grid gap-3" aria-live="polite">
      <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1">
        <span className="font-display font-extrabold text-[30px]/none tracking-[-0.02em]">{formatDuration(total)}</span>
        <span className="text-muted text-[13.5px]">
          {t("arriveAt", { time: clock(new Date(Date.now() + total * 1000)) })} · {formatDistance(legs.reduce((s, l) => s + l.distance, 0))}
        </span>
      </div>
      <LegBar plan={plan} />

      <Card>
        {pickup.kind === "station" ? (
          <>
            <strong className="text-[16px]">{t("pickupAt", { name: pickup.station.name })}</strong>
            <span className={MUTED_SMALL}>{t("pickupMeta", { min: walkToBike, n: pickupCount ?? 0 })}</span>
            {pickup.bikes.length > 0 && <BikeChips bikes={pickup.bikes} onPick={onBike} />}
            {pickupCount !== null && pickupCount <= LOW_STOCK_LIMIT && <Notice tone="warn">{t("lowBikes", { n: pickupCount })}</Notice>}
          </>
        ) : (
          <>
            <strong className="text-[16px]">{t("pickupFreeBike", { number: pickup.bike.number })}</strong>
            <span className={MUTED_SMALL}>{t("freeBikeMeta", { min: walkToBike })}</span>
          </>
        )}
        <Actions>
          <OpenInMevo
            target={
              pickup.kind === "station"
                ? { kind: "station", id: pickup.station.id }
                : pickup.bike.appId
                  ? { kind: "vehicle", id: pickup.bike.appId }
                  : { kind: "app" }
            }
          />
          <Button variant="ghost" href={googleMapsUrl(plan)} external>{t("openInGoogle")}</Button>
        </Actions>
      </Card>

      <div className="grid gap-2 px-0.5">
        <span>
          <strong>{t("dropoffAt", { name: dropoff.name })}</strong>
          <span className={MUTED_SMALL}> · {t("dropoffMeta", { n: dropoff.freeDocks })}</span>
        </span>
        {dropoff.freeDocks <= LOW_STOCK_LIMIT && (
          <Notice tone="warn">
            {plan.dropoffAlternative
              ? t("lowDocks", { n: dropoff.freeDocks, alt: plan.dropoffAlternative.name, docks: plan.dropoffAlternative.freeDocks })
              : t("lowDocksNoAlt", { n: dropoff.freeDocks })}
          </Notice>
        )}
      </div>

      {plan.closerFreeBike && (
        <Notice tone="tip" onClick={() => onBike(plan.closerFreeBike!.bike.number)}>
          {t("closerFreeBike", { number: plan.closerFreeBike.bike.number, dist: formatDistance(plan.closerFreeBike.distance) })}
        </Notice>
      )}

      <details className="group/details">
        <summary className="cursor-pointer text-muted text-[13.5px] font-semibold px-0.5 py-1 group-open/details:mb-2">{t("routeDetails")}</summary>
        <Steps plan={plan} />
      </details>
    </section>
  );
}
