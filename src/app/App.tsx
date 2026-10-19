import { BikePanel } from "../features/bike/BikePanel";
import { LivePanel } from "../features/live/LivePanel";
import { RoutePanel } from "../features/route/RoutePanel";
import { LocateButton } from "../map/LocateButton";
import { MapContainer } from "../map/MapContainer";
import { PickToast } from "../map/PickToast";
import { useUi } from "../store/ui";
import { AppEffects } from "./AppEffects";
import { Sheet } from "./Sheet";

export function App() {
  const tab = useUi((s) => s.tab);

  return (
    <div className="app">
      <AppEffects />
      <MapContainer />
      <LocateButton />
      <PickToast />
      <Sheet>
        {tab === "route" && <RoutePanel />}
        {tab === "bike" && <BikePanel />}
        {tab === "live" && <LivePanel />}
      </Sheet>
    </div>
  );
}
