import { useMemo } from "react";
import { useAllBikes, useStationsData, useSystemStats } from "@/api";
import { useShowStation } from "@/bike/actions";
import { useI18n } from "@/i18n";
import { Notice } from "@/ui";
import "./live.css";

const BATTERY_BUCKET_STARTS = [0, 20, 40, 60, 80] as const;

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "up" | "down" }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {note && <span className={`tile-note${tone ? ` tile-${tone}` : ""}`}>{note}</span>}
    </div>
  );
}

export function LivePanel() {
  const { t, lang } = useI18n();
  const { data: stats, isError: statsError } = useSystemStats();
  const { stations } = useStationsData();
  const { list: bikes } = useAllBikes();
  const onStation = useShowStation();
  const locale = lang === "pl" ? "pl-PL" : "en-GB";
  const num = (n: number) => new Intl.NumberFormat(locale).format(n);
  const compact = (n: number) =>
    n >= 100_000 ? new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 2 }).format(n) : num(n);
  const duration = (s: number) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s`;
  const year = new Date().getFullYear();

  const fleet = useMemo(() => {
    const available = bikes.filter((b) => b.available);
    const ebikes = available.filter((b) => b.type === "ebike" && b.battery != null);
    const buckets = BATTERY_BUCKET_STARTS.map((from) => ebikes.filter((b) => b.battery! >= from && (from === 80 ? b.battery! <= 100 : b.battery! < from + 20)).length);
    const active = stations.filter((s) => s.active);
    return {
      available: available.length,
      ebikes: available.filter((b) => b.type === "ebike").length,
      classic: available.filter((b) => b.type === "bike").length,
      avgBattery: ebikes.length ? Math.round(ebikes.reduce((s, b) => s + b.battery!, 0) / ebikes.length) : null,
      buckets,
      empty: active.filter((s) => s.classicBikes + s.ebikes === 0).length,
      activeStations: active.length,
      fullest: [...active].sort((a, b) => b.classicBikes + b.ebikes - (a.classicBikes + a.ebikes)).slice(0, 5),
    };
  }, [bikes, stations]);

  const maxBucket = Math.max(1, ...fleet.buckets);
  const yearDelta = stats && stats.tripsLastYear ? ((stats.tripsThisYear - stats.tripsLastYear) / stats.tripsLastYear) * 100 : null;
  const recordDate = stats?.recordUsersDate
    ? new Date(`${stats.recordUsersDate}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="panel-body live-panel">
      {statsError && !stats && <Notice tone="error">{t("statsUnavailable")}</Notice>}

      {stats && (
        <>
          <section className="live-hero" aria-live="polite">
            <span className="live-dot" aria-hidden="true" />
            <span className="live-hero-value">{num(stats.activeTrips)}</span>
            <span className="live-hero-label">{t("ridingNow", { n: stats.activeTrips })}</span>
          </section>

          <div className="tiles">
            <Tile label={t("tripsToday")} value={num(stats.tripsToday)} note={t("yesterday", { n: num(stats.tripsYesterday) })} />
            <Tile label={t("ridersToday")} value={num(stats.uniqueUsersToday)} note={t("medianTrip", { d: duration(stats.medianDurationToday) })} />
            <Tile
              label={t("tripsThisYear", { year })}
              value={compact(stats.tripsThisYear)}
              note={yearDelta != null ? t("vsLastYear", { sign: yearDelta >= 0 ? "+" : "−", pct: Math.abs(yearDelta).toFixed(1), year: year - 1 }) : undefined}
              tone={yearDelta != null ? (yearDelta >= 0 ? "up" : "down") : undefined}
            />
            <Tile label={t("recordDay")} value={num(stats.recordTrips)} note={recordDate ? t("recordRiders", { n: num(stats.recordUsers), date: recordDate }) : undefined} />
          </div>
        </>
      )}

      <h3 className="section-title">{t("fleetNow")}</h3>
      <div className="tiles">
        <Tile label={t("availableBikes")} value={num(fleet.available)} note={t("fleetSplit", { e: num(fleet.ebikes), c: num(fleet.classic) })} />
        <Tile label={t("avgBattery")} value={fleet.avgBattery != null ? `${fleet.avgBattery}%` : "—"} note={t("ofAvailableEbikes")} />
        <Tile label={t("emptyStations")} value={num(fleet.empty)} note={t("ofStations", { n: num(fleet.activeStations) })} />
      </div>

      <figure className="hist">
        <figcaption>{t("batteryDistribution")}</figcaption>
        <div className="hist-bars" role="list">
          {fleet.buckets.map((count, i) => {
            const range = `${BATTERY_BUCKET_STARTS[i]}–${BATTERY_BUCKET_STARTS[i] + 20}%`;
            return (
              <div className="hist-col" key={i} role="listitem" title={`${range}: ${num(count)}`} aria-label={`${range}: ${num(count)}`}>
                <span className="hist-count">{num(count)}</span>
                <span className="hist-bar" style={{ height: `${(count / maxBucket) * 100}%` }} />
                <span className="hist-label">{range}</span>
              </div>
            );
          })}
        </div>
      </figure>

      <h3 className="section-title">{t("fullestStations")}</h3>
      <ol className="rank">
        {fleet.fullest.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onStation(s.id)}>
              <span className="rank-name">{s.name}</span>
              <span className="rank-address">{s.address}</span>
              <span className="rank-count">{num(s.classicBikes + s.ebikes)}</span>
            </button>
          </li>
        ))}
      </ol>

      <p className="muted small">{t("statsSource")}</p>
    </div>
  );
}
