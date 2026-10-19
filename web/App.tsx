import { BikePanel } from "@/bike/BikePanel";
import { LivePanel } from "@/live/LivePanel";
import { LocateButton } from "@/map/LocateButton";
import { MapContainer } from "@/map/MapContainer";
import { PickToast } from "@/map/PickToast";
import { Sheet } from "@/panel/Sheet";
import { RoutePanel } from "@/route/RoutePanel";
import { useUi } from "@/store/ui";

export function App() {
  const tab = useUi((s) => s.tab);

  return (
    <div className="app">
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
