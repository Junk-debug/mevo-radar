import { useRef, type ReactNode } from "react";
import { useAllBikes, useStationsData } from "@/api";
import { useI18n, type Lang } from "@/i18n";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { isPhone } from "@/lib/viewport";
import { useUi, type Tab } from "@/store/ui";
import { Icon, IconButton, Notice, Segmented } from "@/ui";
import { BrandMark } from "./BrandMark";
import { Credit } from "./Credit";
import "./sheet.css";

const TABS: Tab[] = ["route", "bike", "live"];
const TAB_LABEL = { route: "tabRoute", bike: "tabBike", live: "tabLive" } as const;
const LANGS: { value: Lang; label: string }[] = [
  { value: "pl", label: "PL" },
  { value: "en", label: "EN" },
];

function useStatusLine() {
  const { t } = useI18n();
  const { stations, error } = useStationsData();
  const bikes = useAllBikes();
  const total = stations.reduce((n, s) => n + s.bikes + s.ebikes, 0) + bikes.freeBikes.length;
  return {
    online: !error && !bikes.error,
    status: stations.length ? t("stationsCount", { s: stations.length, b: total }) : "…",
  };
}

export function Sheet({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { tab, sheet: state, setSheet: onState, showTab: onTab } = useUi();
  const { online, status } = useStatusLine();
  const ref = useRef<HTMLElement>(null);
  const drag = useSheetDrag(ref, state, onState);
  const open = state !== "peek";

  return (
    <>
      <button type="button" className="sheet-open" hidden={open} onClick={() => onState("half")} aria-label={t("showPanel")}>
        <BrandMark />
        <span>{t("appName")}</span>
        <Icon name="chevron-right" size={16} />
      </button>

      <aside
        ref={ref}
        className={`sheet${open ? "" : " collapsed"}${state === "full" ? " full" : ""}`}
        aria-hidden={!open && !isPhone()}
      >
        <div className="sheet-top" {...drag}>
          <button
            type="button"
            className="grabber"
            onClick={() => onState(state === "half" ? "full" : "half")}
            aria-label={state === "half" ? t("fullScreen") : t("halfScreen")}
            aria-expanded={open}
          />
          <header className="sheet-head">
            <div className="brand">
              <BrandMark />
              <div className="brand-text">
                <span className="brand-name">{t("appName")}</span>
                <span className={`live-status${online ? "" : " off"}`} title={online ? t("liveData") : t("offline")}>
                  {status}
                </span>
              </div>
            </div>
            <div className="head-tools">
              <Segmented<Lang> size="sm" label={t("language")} value={lang} onChange={setLang} options={LANGS} />
              <IconButton
                icon="chevron-left"
                className="collapse-btn"
                label={open ? t("hidePanel") : t("showPanel")}
                onClick={() => onState(open ? "peek" : "half")}
              />
            </div>
          </header>

          <nav className="tabs" role="tablist">
            {TABS.map((v) => (
              <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? "on" : ""} onClick={() => onTab(v)}>
                {t(TAB_LABEL[v])}
                {v === "live" && <span className="tab-dot" aria-hidden="true" />}
              </button>
            ))}
          </nav>
        </div>

        {!online && <Notice tone="error">{t("offline")}</Notice>}
        {children}
        <Credit />
      </aside>
    </>
  );
}
