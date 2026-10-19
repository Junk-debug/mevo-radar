import { BikePanel } from "../features/bike/BikePanel";
import { LivePanel } from "../features/live/LivePanel";
import { RoutePanel } from "../features/route/RoutePanel";
import { LocateButton } from "../map/LocateButton";
import { MapView } from "../map/MapView";
import { MapToast } from "../map/MapToast";
import { Sheet } from "./Sheet";
import { useAppController } from "./useAppController";

export function App() {
  const app = useAppController();
  return (
    <div className="app">
      <MapView {...app.map} />
      <LocateButton {...app.locateButton} />
      {app.pickToast && <MapToast {...app.pickToast} />}
      <Sheet {...app.sheet}>
        {app.tab === "route" && <RoutePanel {...app.routePanel} />}
        {app.tab === "bike" && <BikePanel {...app.bikePanel} />}
        {app.tab === "live" && <LivePanel {...app.livePanel} />}
      </Sheet>
    </div>
  );
}
