import { BikePanel } from "@/bike/BikePanel";
import { LivePanel } from "@/live/LivePanel";
import { LocateButton } from "@/map/LocateButton";
import { MapContainer } from "@/map/MapContainer";
import { PickToast } from "@/map/PickToast";
import { Sheet } from "@/panel/Sheet";
import { RoutePanel } from "@/route/RoutePanel";
import { useUi } from "@/store/ui";
import { ErrorBoundary } from "@/ui";

export function App() {
  const tab = useUi((s) => s.tab);

  return (
    <div className="fixed inset-0">
      <MapContainer />
      <LocateButton />
      <PickToast />
      <Sheet>
        <ErrorBoundary key={tab}>
          {tab === "route" && <RoutePanel />}
          {tab === "bike" && <BikePanel />}
          {tab === "live" && <LivePanel />}
        </ErrorBoundary>
      </Sheet>
    </div>
  );
}
