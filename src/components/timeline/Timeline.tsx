import { useRef, useCallback } from "react";
import { useSceneStore } from "../../stores/scene-store";
import TimelinePlayhead from "./TimelinePlayhead";
import TimelineTrack from "./TimelineTrack";

const TRACK_AREA_WIDTH = 800;
const LABEL_WIDTH = 140;

const LAYER_COLORS: Record<string, string> = {
  spotlight: "#f59e0b",
  blur: "#6366f1",
  zoom: "#10b981",
  arrow: "#ef4444",
  text: "#3b82f6",
  callout: "#8b5cf6",
  region_replace: "#14b8a6",
  tap: "#f97316",
  cursor: "#ec4899",
  shape: "#06b6d4",
};

export default function Timeline() {
  const devices = useSceneStore((s) => s.scene.devices);
  const duration = useSceneStore((s) => s.scene.canvas.duration);
  const currentTime = useSceneStore((s) => s.editor.currentTime);
  const isPlaying = useSceneStore((s) => s.editor.isPlaying);
  const selectedDeviceId = useSceneStore((s) => s.editor.selectedDeviceId);
  const selectedLayerId = useSceneStore((s) => s.editor.selectedLayerId);
  const setCurrentTime = useSceneStore((s) => s.setCurrentTime);
  const setPlaying = useSceneStore((s) => s.setPlaying);
  const selectDevice = useSceneStore((s) => s.selectDevice);
  const selectLayer = useSceneStore((s) => s.selectLayer);

  const trackAreaRef = useRef<HTMLDivElement>(null);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = trackAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const t = Math.max(0, Math.min(duration, (x / TRACK_AREA_WIDTH) * duration));
      setCurrentTime(Math.round(t * 100) / 100);
    },
    [duration, setCurrentTime]
  );

  function handleRewind() {
    setCurrentTime(0);
  }

  function handleForward() {
    setCurrentTime(Math.min(currentTime + 1, duration));
  }

  // Build time ruler marks
  const rulerMarks: number[] = [];
  for (let t = 0; t <= duration; t += 1) {
    rulerMarks.push(t);
  }

  return (
    <div className="h-full bg-[#0d0d1a] border-t border-[#2a2a4a] flex flex-col select-none">
      {/* Transport controls + ruler */}
      <div className="flex items-center h-7 border-b border-[#2a2a4a] shrink-0">
        {/* Transport */}
        <div className="w-[140px] shrink-0 flex items-center gap-1 px-2">
          <button
            className="w-6 h-5 text-xs text-[#888] hover:text-white rounded hover:bg-[#ffffff08] transition-colors"
            onClick={handleRewind}
            title="Rewind"
          >
            {"<<"}
          </button>
          <button
            className={`w-6 h-5 text-xs rounded transition-colors ${
              isPlaying
                ? "text-[#7c7cff] bg-[#7c7cff]/20"
                : "text-[#888] hover:text-white hover:bg-[#ffffff08]"
            }`}
            onClick={() => setPlaying(!isPlaying)}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "||" : ">"}
          </button>
          <button
            className="w-6 h-5 text-xs text-[#888] hover:text-white rounded hover:bg-[#ffffff08] transition-colors"
            onClick={handleForward}
            title="Forward"
          >
            {">>"}
          </button>
          <span className="text-[10px] text-[#666] ml-1">
            {currentTime.toFixed(1)}s
          </span>
        </div>

        {/* Ruler */}
        <div
          className="relative h-full"
          style={{ width: TRACK_AREA_WIDTH }}
          ref={trackAreaRef}
          onClick={handleSeek}
        >
          {rulerMarks.map((t) => {
            const x = (t / duration) * TRACK_AREA_WIDTH;
            return (
              <div key={t} className="absolute top-0 h-full" style={{ left: `${x}px` }}>
                <div className="w-px h-2 bg-[#2a2a4a]" />
                <span className="absolute top-2 -translate-x-1/2 text-[9px] text-[#555]">
                  {t}s
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Playhead overlay */}
        <TimelinePlayhead
          currentTime={currentTime}
          duration={duration}
          trackAreaWidth={TRACK_AREA_WIDTH}
          trackAreaLeft={LABEL_WIDTH}
        />

        {devices.length === 0 && (
          <div className="text-xs text-[#555] px-3 py-3">
            Add a device to see timeline tracks.
          </div>
        )}

        {devices.map((device) => (
          <div key={device.id}>
            {/* Device track */}
            <TimelineTrack
              label={device.name}
              color="#4a4a6a"
              timeRange={[0, duration]}
              duration={duration}
              trackAreaWidth={TRACK_AREA_WIDTH}
              isSelected={selectedDeviceId === device.id && !selectedLayerId}
              onClick={() => {
                selectDevice(device.id);
                selectLayer(null);
              }}
            />
            {/* Layer tracks */}
            {device.layers.map((layer) => (
              <TimelineTrack
                key={layer.id}
                label={layer.name}
                color={LAYER_COLORS[layer.type] || "#666"}
                timeRange={layer.timeRange}
                duration={duration}
                trackAreaWidth={TRACK_AREA_WIDTH}
                isIndented
                isSelected={selectedLayerId === layer.id}
                onClick={() => {
                  selectDevice(device.id);
                  selectLayer(layer.id);
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
