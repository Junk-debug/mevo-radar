import { useRef, type ReactNode } from "react";
import { useI18n, type Lang } from "../i18n";
import { useSheetDrag, type SheetState } from "../lib/useSheetDrag";
import { isPhone } from "../lib/viewport";
import { BrandMark } from "./BrandMark";
import { Credit } from "./Credit";
import "./sheet.css";

export type Tab = "route" | "bike" | "live";
const TABS: Tab[] = ["route", "bike", "live"];
const TAB_LABEL = { route: "tabRoute", bike: "tabBike", live: "tabLive" } as const;

interface Props {
  state: SheetState;
  onState: (s: SheetState) => void;
  tab: Tab;
  onTab: (t: Tab) => void;
  online: boolean;
  status: string;
  children: ReactNode;
}

export function Sheet({ state, onState, tab, onTab, online, status, children }: Props) {
  const { t, lang, setLang } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const drag = useSheetDrag(ref, state, onState);
  const open = state !== "peek";

  return (
    <>
      <button type="button" className="sheet-open" hidden={open} onClick={() => onState("half")} aria-label={t("showPanel")}>
        <BrandMark />
        <span>{t("appName")}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
              <div className="lang" role="group" aria-label={t("language")}>
                {(["pl", "en"] as Lang[]).map((l) => (
                  <button key={l} type="button" className={lang === l ? "on" : ""} aria-pressed={lang === l} onClick={() => setLang(l)}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="icon-btn collapse-btn"
                onClick={() => onState(open ? "peek" : "half")}
                aria-label={open ? t("hidePanel") : t("showPanel")}
                title={open ? t("hidePanel") : t("showPanel")}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
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

        {!online && <p className="notice notice-error">{t("offline")}</p>}
        {children}
        <Credit />
      </aside>
    </>
  );
}
