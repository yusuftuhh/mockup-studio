import { useEffect, useRef } from "react";
import TopBar from "./components/panels/TopBar";
import DevicePanel from "./components/panels/DevicePanel";
import LayerPanel from "./components/panels/LayerPanel";
import PropertyPanel from "./components/panels/PropertyPanel";
import Viewport from "./components/viewport/Viewport";
import Timeline from "./components/timeline/Timeline";
import { useSceneStore } from "./stores/scene-store";

function App() {
  const isPlaying = useSceneStore((s) => s.editor.isPlaying);
  const duration = useSceneStore((s) => s.scene.canvas.duration);
  const setCurrentTime = useSceneStore((s) => s.setCurrentTime);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const delta = (timestamp - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = timestamp;

      const store = useSceneStore.getState();
      let next = store.editor.currentTime + delta;

      // Loop: reset to 0 when past duration
      if (next >= duration) {
        next = 0;
      }

      setCurrentTime(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying, duration, setCurrentTime]);

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
