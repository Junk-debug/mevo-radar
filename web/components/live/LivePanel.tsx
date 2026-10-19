import { useMemo } from "react";
import { cx, Notice } from "@/components/ui";
import { useShowStation } from "@/hooks/useShowStation";
import { useI18n } from "@/i18n";
import { useAllBikes, useStationsData, useSystemStats } from "@/services/api";

const BATTERY_BUCKET_STARTS = [0, 20, 40, 60, 80] as const;

const NOTE_TONE = { up: "text-ok", down: "text-gone", none: "text-muted" };
// Two columns, or three when there are exactly three tiles.
const TILES = "grid grid-cols-2 gap-2 has-[>:nth-child(3):last-child]:grid-cols-3";
const SECTION_TITLE = "mt-1.5 mx-0 mb-[-4px] text-[12px] font-semibold uppercase tracking-[0.06em] text-muted";

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "up" | "down" }) {
  return (
    <div className="grid gap-0.5 content-start px-3 py-2.5 rounded-md bg-surface-2 min-w-0">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="font-body font-[650] text-[22px]/[1.15] tracking-[-0.01em]">{value}</span>
      {note && <span className={cx("text-[12px]", NOTE_TONE[tone ?? "none"])}>{note}</span>}
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
    <>
      {statsError && !stats && <Notice tone="error">{t("statsUnavailable")}</Notice>}

      {stats && (
        <>
          <section className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-0.5" aria-live="polite">
            <span className="size-2.5 rounded-full bg-accent shadow-[0_0_0_0_color-mix(in_srgb,var(--accent)_50%,transparent)] animate-live-pulse motion-reduce:animate-none" aria-hidden="true" />
            <span className="font-body font-bold text-[56px]/none tracking-[-0.03em]">{num(stats.activeTrips)}</span>
            <span className="col-start-2 text-muted text-[14px]">{t("ridingNow", { n: stats.activeTrips })}</span>
          </section>

          <div className={TILES}>
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

      <h3 className={SECTION_TITLE}>{t("fleetNow")}</h3>
      <div className={TILES}>
        <Tile label={t("availableBikes")} value={num(fleet.available)} note={t("fleetSplit", { e: num(fleet.ebikes), c: num(fleet.classic) })} />
        <Tile label={t("avgBattery")} value={fleet.avgBattery != null ? `${fleet.avgBattery}%` : "—"} note={t("ofAvailableEbikes")} />
        <Tile label={t("emptyStations")} value={num(fleet.empty)} note={t("ofStations", { n: num(fleet.activeStations) })} />
      </div>

      <figure className="m-0 grid gap-2">
        <figcaption className="text-[12px] text-muted">{t("batteryDistribution")}</figcaption>
        <div className="grid grid-cols-[repeat(5,1fr)] gap-0.5 h-[120px] items-end" role="list">
          {fleet.buckets.map((count, i) => {
            const range = `${BATTERY_BUCKET_STARTS[i]}–${BATTERY_BUCKET_STARTS[i] + 20}%`;
            return (
              <div className="group/col grid grid-rows-[auto_1fr_auto] h-full items-end gap-1 text-center" key={i} role="listitem" title={`${range}: ${num(count)}`} aria-label={`${range}: ${num(count)}`}>
                <span className="text-[12px] font-semibold">{num(count)}</span>
                <span className="block min-h-[2px] bg-ebike rounded-t-[4px] self-end group-hover/col:brightness-112" style={{ height: `${(count / maxBucket) * 100}%` }} />
                <span className="text-[11px] text-muted border-t border-line pt-1">{range}</span>
              </div>
            );
          })}
        </div>
      </figure>

      <h3 className={SECTION_TITLE}>{t("fullestStations")}</h3>
      <ol className="list-none m-0 p-0 grid gap-1">
        {fleet.fullest.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="w-full grid grid-cols-[1fr_auto] gap-x-3 text-left px-3 py-2 border-0 rounded-sm bg-surface-2 hover:shadow-[inset_0_0_0_1px_var(--line)]"
              onClick={() => onStation(s.id)}
            >
              <span className="font-mono font-bold text-[14px]/[normal] tracking-[0.03em]">{s.name}</span>
              <span className="col-start-1 text-[12px] text-muted truncate">{s.address}</span>
              <span className="col-start-2 [grid-row:1/span_2] self-center font-bold text-[18px]">{num(s.classicBikes + s.ebikes)}</span>
            </button>
          </li>
        ))}
      </ol>

      <p className="text-muted text-[13px]">{t("statsSource")}</p>
    </>
  );
}
