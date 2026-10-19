import { useI18n } from "../../i18n";
import type { BikePreference } from "../../lib/planner";
import { PlaceInput } from "./PlaceInput";
import { RouteResult } from "./RouteResult";
import type { Field, RoutePlanner } from "./useRoutePlanner";
import "./route.css";

interface Props {
  planner: RoutePlanner;
  onPickOnMap: (field: Field) => void;
  onUseMyLocation: () => void;
  onInputFocus: () => void;
  onBike: (number: string) => void;
}

const PREFS: { value: BikePreference; label: "prefAny" | "prefEbike" | "prefBike" }[] = [
  { value: "any", label: "prefAny" },
  { value: "ebike", label: "prefEbike" },
  { value: "bike", label: "prefBike" },
];

const ERRORS = { noBikes: "noBikes", noDocks: "noDocks", failed: "routeFailed" } as const;

export function RoutePanel({ planner, onPickOnMap, onUseMyLocation, onInputFocus, onBike }: Props) {
  const { t } = useI18n();
  const { start, to, pref, plan, status } = planner;

  return (
    <div className="panel-body">
      <div className="places">
        <PlaceInput
          field="from"
          value={start}
          placeholder={t("startPlaceholder")}
          onChoose={(p) => planner.choose("from", p)}
          onPickOnMap={() => onPickOnMap("from")}
          onUseMyLocation={onUseMyLocation}
          onFocus={onInputFocus}
        />
        <PlaceInput
          field="to"
          value={to}
          placeholder={t("whereTo")}
          onChoose={(p) => planner.choose("to", p)}
          onPickOnMap={() => onPickOnMap("to")}
          onFocus={onInputFocus}
        />
        <button type="button" className="swap" title={t("swap")} aria-label={t("swap")} onClick={planner.swap} disabled={!start && !to}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="segmented" role="radiogroup" aria-label={t("type")}>
        {PREFS.map((p) => (
          <button key={p.value} type="button" role="radio" aria-checked={pref === p.value} className={pref === p.value ? "on" : ""} onClick={() => planner.setPref(p.value)}>
            {t(p.label)}
          </button>
        ))}
      </div>

      {status === "loading" && <p className="route-loading" role="status">{t("searching")}</p>}
      {status in ERRORS && <p className="notice notice-error" role="alert">{t(ERRORS[status as keyof typeof ERRORS])}</p>}
      {plan && status === "ready" && <RouteResult plan={plan} pref={pref} onBike={onBike} />}
    </div>
  );
}
