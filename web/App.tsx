import { BikePanel } from "@/components/bike/BikePanel";
import { LivePanel } from "@/components/live/LivePanel";
import { LocateButton } from "@/components/map/LocateButton";
import { MapContainer } from "@/components/map/MapContainer";
import { PickToast } from "@/components/map/PickToast";
import { ErrorBoundary } from "@/components/panel/ErrorBoundary";
import { Sheet } from "@/components/panel/Sheet";
import { RoutePanel } from "@/components/route/RoutePanel";
import { useUi } from "@/store/ui";

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
