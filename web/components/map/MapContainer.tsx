import { useShowStation } from "@/hooks/useShowStation";
import { useTrackBike } from "@/hooks/useTrackBike";
import { useI18n } from "@/i18n";
import { useAllBikes, useStationsData } from "@/services/api";
import { useBikeStore } from "@/store/bike";
import { useLocationStore } from "@/store/location";
import { useRouteStore } from "@/store/route";
import { useUi } from "@/store/ui";
import { isPhone } from "@/utils/viewport";
import { MapView } from "./MapView";
import { useMapMarkers } from "./useMapMarkers";
import { useTheme } from "./useTheme";

export function MapContainer() {
  const { t, lang } = useI18n();
  const { tab, sheet, camera } = useUi();
  const plan = useRouteStore((s) => s.plan);
  const me = useLocationStore((s) => s.pos);
  const { stations } = useStationsData();
  const { freeBikes } = useAllBikes();
  const markers = useMapMarkers();
  const track = useTrackBike();
  const showStation = useShowStation();
  const routePlan = tab === "route" ? plan : null;

  return (
    <MapView
      theme={useTheme()}
      sheet={sheet}
      camera={camera}
      stations={stations}
      freeBikes={freeBikes}
      plan={routePlan}
      dimStations={routePlan !== null}
      markers={markers}
      me={me}
      onStationClick={showStation}
      onBikeClick={track}
      onMapClick={(pos) => {
        const { picking, pickPoint } = useRouteStore.getState();
        if (picking) pickPoint(picking, pos, t("pointOnMap"), lang);
        else if (tab === "bike") useBikeStore.getState().selectStation(null);
      }}
      onUserMove={() => {
        if (isPhone() && !useRouteStore.getState().picking) useUi.getState().setSheet("peek");
      }}
    />
  );
}
