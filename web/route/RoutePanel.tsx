import { useI18n } from "@/i18n";
import type { BikePreference } from "@/lib/planner";
import { isPhone } from "@/lib/viewport";
import { useLocationStore } from "@/store/location";
import { useRouteStore, type Field } from "@/store/route";
import { useUi } from "@/store/ui";
import { IconButton, Notice, Segmented } from "@/ui";
import { PlaceInput } from "./PlaceInput";
import { RouteResult } from "./RouteResult";
import { useAutoPlan } from "./useAutoPlan";
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
  useAutoPlan();
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
        <IconButton icon="swap" variant="round" className="swap" label={t("swap")} onClick={() => swap(start)} disabled={!start && !to} />
      </div>

      <Segmented label={t("type")} value={pref} onChange={setPref} options={PREFS.map((p) => ({ value: p.value, label: t(p.label) }))} />

      {status === "loading" && <p className="route-loading" role="status">{t("searching")}</p>}
      {status in ERRORS && <Notice tone="error">{t(ERRORS[status as keyof typeof ERRORS])}</Notice>}
      {plan && status === "ready" && <RouteResult plan={plan} pref={pref} />}
    </div>
  );
}
