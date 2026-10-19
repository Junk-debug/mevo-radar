import { useI18n } from "../../i18n";
import type { BikePreference } from "../../lib/planner";
import { isPhone } from "../../lib/viewport";
import { useLocationStore } from "../../store/location";
import { useRouteStore, type Field } from "../../store/route";
import { useUi } from "../../store/ui";
import { PlaceInput } from "./PlaceInput";
import { RouteResult } from "./RouteResult";
import { useRouteStart } from "./useRouteStart";
import "./route.css";

const PREFS: { value: BikePreference; label: "prefAny" | "prefEbike" | "prefBike" }[] = [
  { value: "any", label: "prefAny" },
  { value: "ebike", label: "prefEbike" },
  { value: "bike", label: "prefBike" },
];

const ERRORS = { noBikes: "noBikes", noDocks: "noDocks", failed: "routeFailed" } as const;

const pickOnMap = (field: Field) => {
  useRouteStore.getState().setPicking(field);
  useUi.getState().setSheet("peek");
};

const chooseMyLocation = async () => {
  if (await useLocationStore.getState().locate()) useRouteStore.getState().choose("from", null);
};

const expandOnPhone = () => isPhone() && useUi.getState().setSheet("full");

export function RoutePanel() {
  const { t } = useI18n();
  const start = useRouteStart();
  const { to, pref, plan, status, choose, setPref, swap } = useRouteStore();

  return (
    <div className="panel-body">
      <div className="places">
        <PlaceInput
          field="from"
          value={start}
          placeholder={t("startPlaceholder")}
          onChoose={(p) => choose("from", p)}
          onPickOnMap={() => pickOnMap("from")}
          onUseMyLocation={chooseMyLocation}
          onFocus={expandOnPhone}
        />
        <PlaceInput
          field="to"
          value={to}
          placeholder={t("whereTo")}
          onChoose={(p) => choose("to", p)}
          onPickOnMap={() => pickOnMap("to")}
          onFocus={expandOnPhone}
        />
        <button type="button" className="swap" title={t("swap")} aria-label={t("swap")} onClick={() => swap(start)} disabled={!start && !to}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="segmented" role="radiogroup" aria-label={t("type")}>
        {PREFS.map((p) => (
          <button key={p.value} type="button" role="radio" aria-checked={pref === p.value} className={pref === p.value ? "on" : ""} onClick={() => setPref(p.value)}>
            {t(p.label)}
          </button>
        ))}
      </div>

      {status === "loading" && <p className="route-loading" role="status">{t("searching")}</p>}
      {status in ERRORS && <p className="notice notice-error" role="alert">{t(ERRORS[status as keyof typeof ERRORS])}</p>}
      {plan && status === "ready" && <RouteResult plan={plan} pref={pref} />}
    </div>
  );
}
