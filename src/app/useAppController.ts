import { useSystemStats } from "../api";
import { useBikeTab } from "../features/bike/useBikeTab";
import { useRouteTab } from "../features/route/useRouteTab";
import { useI18n } from "../i18n";
import type { LatLon } from "../lib/geo";
import { isPhone } from "../lib/viewport";
import type { Tab } from "./Sheet";
import { useAppData } from "./useAppData";
import { useLocate } from "./useLocate";
import { useNavigation } from "./useNavigation";
import { useTheme } from "./useTheme";

/** Wires the tabs, the map and the panel together; returns ready-made props for App to render. */
export function useAppController() {
  const { t } = useI18n();
  const theme = useTheme();
  const data = useAppData();
  const nav = useNavigation();
  const locate = useLocate();
  const bike = useBikeTab(data, nav, locate);
  const route = useRouteTab(data, nav, locate, bike.track);
  const stats = useSystemStats(nav.tab === "live");
  const { tab } = nav;

  return {
    tab,
    map: {
      theme,
      sheet: nav.sheet,
      camera: nav.camera,
      stations: data.stations,
      freeBikes: data.freeBikes,
      me: locate.pos,
      plan: tab === "route" ? route.plan : null,
      dimStations: tab === "route" && route.plan !== null,
      markers: tab === "route" ? route.markers : tab === "bike" ? bike.markers : [],
      onStationClick: bike.showStation,
      onBikeClick: bike.track,
      onMapClick: (pos: LatLon) => {
        if (!route.pickAt(pos) && tab === "bike") bike.deselect();
      },
      onUserMove: () => {
        if (isPhone() && !route.picking) nav.setSheet("peek");
      },
    },
    locateButton: {
      status: locate.status,
      known: !!locate.pos,
      showHint: locate.hint,
      onClick: async () => {
        const pos = await locate.locate();
        if (pos) nav.focusOn(pos, 16);
      },
    },
    pickToast: route.picking && {
      text: t(route.picking === "from" ? "pickingStart" : "pickingDestination"),
      onCancel: route.cancelPicking,
    },
    sheet: {
      state: nav.sheet,
      onState: nav.setSheet,
      tab,
      onTab: (next: Tab) => {
        nav.showTab(next);
        if (next === "bike") bike.enter();
      },
      online: data.online,
      status: data.summary,
    },
    routePanel: route.panel,
    bikePanel: bike.panel,
    livePanel: {
      stats: stats.data,
      statsError: stats.isError,
      stations: data.stations,
      bikes: data.all.list,
      onStation: bike.showStation,
    },
  };
}
