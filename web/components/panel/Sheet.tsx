import { useRef, type ReactNode } from "react";
import { cx, Icon, IconButton, Notice, Segmented } from "@/components/ui";
import { useI18n, type Lang } from "@/i18n";
import { useAllBikes, useStationsData } from "@/services/api";
import { useUi, type Tab } from "@/store/ui";
import { isPhone } from "@/utils/viewport";
import { BrandMark } from "./BrandMark";
import { Credit } from "./Credit";
import { useSheetDrag } from "./useSheetDrag";

const TABS: Tab[] = ["route", "bike", "live"];
const TAB_LABEL = { route: "tabRoute", bike: "tabBike", live: "tabLive" } as const;
const LANGS: { value: Lang; label: string }[] = [
  { value: "pl", label: "PL" },
  { value: "en", label: "EN" },
];

// The sheet is the Tailwind `group`: its state classes `collapsed` and `full` (set here) and `dragging`
// (toggled by useSheetDrag) restyle the parts inside via group-[.x] variants.
const SAFE_TOP = "top-[calc(16px_+_env(safe-area-inset-top,0px))]";
const SAFE_LEFT = "left-[max(16px,env(safe-area-inset-left,0px))]";

const SHEET = cx(
  "group absolute z-2 flex flex-col overflow-hidden bg-surface rounded-lg shadow-panel",
  SAFE_TOP,
  SAFE_LEFT,
  "w-[412px] max-h-[calc(100%_-_32px_-_env(safe-area-inset-top,0px)_-_env(safe-area-inset-bottom,0px))]",
  // Desktop: the panel slides out to the left; visibility flips after the slide so it stays focusable until then.
  "desktop:[transition:transform_0.28s_cubic-bezier(.2,.7,.2,1),opacity_0.2s_ease,visibility_0s_linear_0s]",
  "desktop:[&.collapsed]:[transform:translateX(calc(-100%_-_40px))] desktop:[&.collapsed]:opacity-0 desktop:[&.collapsed]:invisible desktop:[&.collapsed]:pointer-events-none",
  "desktop:[&.collapsed]:[transition:transform_0.28s_cubic-bezier(.2,.7,.2,1),opacity_0.2s_ease,visibility_0s_linear_0.28s]",
  // Phone: a bottom sheet with peek (collapsed), half and full heights.
  "max-desktop:top-auto max-desktop:bottom-0 max-desktop:left-0 max-desktop:right-0 max-desktop:w-auto max-desktop:max-h-[64dvh] max-desktop:rounded-b-none",
  "max-desktop:pt-0 max-desktop:pr-[env(safe-area-inset-right,0px)] max-desktop:pb-[env(safe-area-inset-bottom,0px)] max-desktop:pl-[env(safe-area-inset-left,0px)]",
  "max-desktop:[transition:max-height_0.25s_ease,transform_0.2s_ease] max-desktop:[&.dragging]:[transition:none]",
  "max-desktop:[&.collapsed]:max-h-[calc(118px_+_env(safe-area-inset-bottom,0px))]",
  "max-desktop:[&.full]:h-[calc(100dvh_-_env(safe-area-inset-top,0px)_-_8px)] max-desktop:[&.full]:max-h-none",
);

const OPEN_BUTTON = cx(
  "hidden desktop:inline-flex absolute z-2 items-center gap-2.5 py-2 pr-3 pl-2 border-0 rounded-full",
  SAFE_TOP,
  SAFE_LEFT,
  "bg-surface text-ink shadow-panel font-display font-extrabold text-[15px]/none",
);

const PANEL_BODY = cx(
  "grid gap-3.5 px-[18px] pt-4 pb-5 overflow-y-auto overscroll-contain",
  "max-desktop:px-4 max-desktop:pt-3.5 max-desktop:pb-[18px]",
  "max-desktop:group-[.full]:flex-1 max-desktop:group-[.full]:content-start max-desktop:group-[.collapsed]:hidden",
);

const STATUS_DOT = {
  online: "before:bg-ok before:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ok)_22%,transparent)]",
  offline: "before:bg-gone",
};

function useStatusLine() {
  const { t } = useI18n();
  const { stations, error } = useStationsData();
  const bikes = useAllBikes();
  const total = stations.reduce((n, s) => n + s.classicBikes + s.ebikes, 0) + bikes.freeBikes.length;
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
      {!open && (
        <button type="button" className={OPEN_BUTTON} onClick={() => onState("half")} aria-label={t("showPanel")}>
          <BrandMark size={28} />
          <span>{t("appName")}</span>
          <Icon name="chevron-right" size={16} />
        </button>
      )}

      <aside ref={ref} className={cx(SHEET, !open && "collapsed", state === "full" && "full")} aria-hidden={!open && !isPhone()}>
        <div className="flex-none max-desktop:touch-none max-desktop:cursor-grab max-desktop:group-[.dragging]:cursor-grabbing" {...drag}>
          <button
            type="button"
            className="hidden max-desktop:block relative flex-none w-full h-[18px] border-0 p-0 bg-transparent after:content-[''] after:absolute after:left-1/2 after:top-2 after:w-[38px] after:h-[4.5px] after:ml-[-19px] after:rounded-[3px] after:bg-line"
            onClick={() => onState(state === "half" ? "full" : "half")}
            aria-label={state === "half" ? t("fullScreen") : t("halfScreen")}
            aria-expanded={open}
          />
          <header className="flex items-center justify-between gap-3 pt-4 px-[18px] pb-3 max-desktop:pt-1 max-desktop:px-4 max-desktop:pb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandMark />
              <div className="grid gap-[5px] min-w-0">
                <span className="font-display font-extrabold text-[17px]/none tracking-[-0.01em] whitespace-nowrap">{t("appName")}</span>
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 font-mono font-medium text-[11px]/[1.2] text-muted whitespace-nowrap",
                    "before:content-[''] before:size-[7px] before:rounded-full",
                    STATUS_DOT[online ? "online" : "offline"],
                  )}
                  title={online ? t("liveData") : t("offline")}
                >
                  {status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Segmented<Lang> size="sm" label={t("language")} value={lang} onChange={setLang} options={LANGS} />
              {/* One button: "down" (hide) while open, "up" (show) while collapsed on phones. */}
              <IconButton
                icon="chevron-left"
                className="*:transition-transform *:duration-200 *:ease-[ease] max-desktop:*:rotate-[-90deg] max-desktop:group-[.collapsed]:*:rotate-90"
                label={open ? t("hidePanel") : t("showPanel")}
                onClick={() => onState(open ? "peek" : "half")}
              />
            </div>
          </header>

          <nav className="grid grid-cols-3 mx-[18px] border-b border-line max-desktop:mx-4" role="tablist">
            {TABS.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={tab === v}
                className="px-0 pt-2.5 pb-3 mb-[-1px] border-x-0 border-t-0 border-b-[2.5px] border-transparent bg-transparent font-semibold text-muted aria-selected:text-ink aria-selected:border-b-accent"
                onClick={() => onTab(v)}
              >
                {t(TAB_LABEL[v])}
                {v === "live" && <span className="inline-block size-1.5 ml-1.5 align-[2px] rounded-full bg-accent" aria-hidden="true" />}
              </button>
            ))}
          </nav>
        </div>

        {!online && <Notice tone="error" className="max-desktop:group-[.collapsed]:hidden">{t("offline")}</Notice>}
        <div className={PANEL_BODY}>{children}</div>
        <Credit />
      </aside>
    </>
  );
}
