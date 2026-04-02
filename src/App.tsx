import TopBar from "./components/panels/TopBar";
import DevicePanel from "./components/panels/DevicePanel";
import LayerPanel from "./components/panels/LayerPanel";
import PropertyPanel from "./components/panels/PropertyPanel";
import Viewport from "./components/viewport/Viewport";
import Timeline from "./components/timeline/Timeline";

function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0a1a]">
      {/* Top Bar */}
      <TopBar />

      {/* Main content: left | center | right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Device + Layer panels */}
        <div className="w-60 shrink-0 bg-[#16162a] border-r border-[#2a2a4a] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto border-b border-[#2a2a4a]">
            <DevicePanel />
          </div>
          <div className="h-52 shrink-0 overflow-y-auto">
            <LayerPanel />
          </div>
        </div>

        {/* Center + Bottom */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Center viewport */}
          <div className="flex-1 overflow-hidden">
            <Viewport />
          </div>

          {/* Bottom timeline */}
          <div className="h-44 shrink-0">
            <Timeline />
          </div>
        </div>

        {/* Right sidebar: Property panel */}
        <div className="w-70 shrink-0 bg-[#16162a] border-l border-[#2a2a4a] overflow-y-auto">
          <PropertyPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
