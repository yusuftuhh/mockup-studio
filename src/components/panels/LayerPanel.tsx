import { useSceneStore } from "../../stores/scene-store";
import type { LayerType, Layer } from "../../types/scene";

const LAYER_TYPE_COLORS: Record<LayerType, string> = {
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

const LAYER_TYPE_LABELS: Record<LayerType, string> = {
  spotlight: "Spot",
  blur: "Blur",
  zoom: "Zoom",
  arrow: "Arrow",
  text: "Text",
  callout: "Call",
  region_replace: "Repl",
  tap: "Tap",
  cursor: "Curs",
  shape: "Shape",
};

const ALL_LAYER_TYPES: LayerType[] = [
  "spotlight",
  "text",
  "arrow",
  "shape",
  "blur",
  "tap",
  "callout",
  "zoom",
  "cursor",
  "region_replace",
];

function createDefaultLayer(type: LayerType): Omit<Layer, "id"> {
  const base = {
    visible: true,
    locked: false,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    timeRange: [0, 5] as [number, number],
    animation: {
      entry: "fade" as const,
      exit: "fade" as const,
      easing: "ease-in-out" as const,
    },
    keyframes: [],
  };

  switch (type) {
    case "spotlight":
      return {
        ...base,
        type: "spotlight",
        properties: {
          center: [400, 300] as [number, number],
          radius: 80,
          shape: "circle" as const,
          dimOpacity: 0.6,
          feather: 0.3,
        },
      };
    case "text":
      return {
        ...base,
        type: "text",
        properties: {
          text: "Sample Text",
          position: [100, 100] as [number, number],
          fontSize: 24,
          color: "#ffffff",
          backgroundColor: null,
          fontFamily: "sans-serif",
          shadow: false,
        },
      };
    case "arrow":
      return {
        ...base,
        type: "arrow",
        properties: {
          from: [100, 100] as [number, number],
          to: [300, 200] as [number, number],
          color: "#ff4444",
          thickness: 3,
          headSize: 12,
          style: "solid" as const,
        },
      };
    case "shape":
      return {
        ...base,
        type: "shape",
        properties: {
          shapeType: "rect" as const,
          position: [100, 100] as [number, number],
          size: [200, 150] as [number, number],
          color: "#7c7cff",
          opacity: 0.8,
          strokeWidth: 2,
          filled: false,
        },
      };
    case "blur":
      return {
        ...base,
        type: "blur",
        properties: {
          region: { x: 100, y: 100, width: 200, height: 100 },
          strength: 5,
        },
      };
    case "tap":
      return {
        ...base,
        type: "tap",
        properties: {
          position: [400, 300] as [number, number],
          rippleColor: "#7c7cff",
          rippleSize: 40,
        },
      };
    case "callout":
      return {
        ...base,
        type: "callout",
        properties: {
          position: [200, 100] as [number, number],
          targetPosition: [400, 300] as [number, number],
          label: "1",
          style: "badge" as const,
          color: "#7c7cff",
          fontSize: 14,
        },
      };
    case "zoom":
      return {
        ...base,
        type: "zoom",
        properties: {
          sourceRegion: { x: 100, y: 100, w: 200, h: 200 },
          displayPosition: [500, 100] as [number, number],
          scale: 2,
          borderColor: "#7c7cff",
          borderWidth: 2,
          showConnector: true,
        },
      };
    case "cursor":
      return {
        ...base,
        type: "cursor",
        properties: {
          path: [
            [100, 100],
            [300, 300],
          ] as [number, number][],
          style: "pointer" as const,
          color: "#ffffff",
          size: 24,
        },
      };
    case "region_replace":
      return {
        ...base,
        type: "region_replace",
        properties: {
          region: { x: 0, y: 0, w: 100, h: 100 },
          source: "",
        },
      };
  }
}

export default function LayerPanel() {
  const selectedDeviceId = useSceneStore((s) => s.editor.selectedDeviceId);
  const selectedLayerId = useSceneStore((s) => s.editor.selectedLayerId);
  const devices = useSceneStore((s) => s.scene.devices);
  const selectLayer = useSceneStore((s) => s.selectLayer);
  const addLayer = useSceneStore((s) => s.addLayer);
  const removeLayer = useSceneStore((s) => s.removeLayer);
  const updateLayer = useSceneStore((s) => s.updateLayer);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const layers = selectedDevice?.layers ?? [];

  // Display in reverse order (top layer first)
  const reversedLayers = [...layers].reverse();

  function handleToggleVisible(layer: Layer) {
    if (!selectedDeviceId) return;
    updateLayer(selectedDeviceId, layer.id, { visible: !layer.visible });
  }

  function handleToggleLock(layer: Layer) {
    if (!selectedDeviceId) return;
    updateLayer(selectedDeviceId, layer.id, { locked: !layer.locked });
  }

  if (!selectedDeviceId) {
    return (
      <div className="p-3">
        <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
          Layers
        </div>
        <div className="text-xs text-[#555]">Select a device first.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Layer list */}
      <div className="p-2 border-b border-[#2a2a4a] flex-1 overflow-y-auto">
        <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2 px-1">
          Layers
        </div>
        {reversedLayers.length === 0 && (
          <div className="text-xs text-[#555] px-1 py-2">
            No layers. Add one below.
          </div>
        )}
        {reversedLayers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs cursor-pointer group ${
              selectedLayerId === layer.id
                ? "bg-[#7c7cff]/20 text-[#7c7cff]"
                : "text-[#ccc] hover:bg-[#ffffff08]"
            }`}
            onClick={() => selectLayer(layer.id)}
          >
            {/* Color indicator */}
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: LAYER_TYPE_COLORS[layer.type] }}
            />
            {/* Name */}
            <span className="truncate flex-1">{layer.name}</span>
            {/* Visibility toggle */}
            <button
              className={`text-[10px] ${layer.visible ? "text-[#888]" : "text-[#444]"} hover:text-white transition-colors`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleVisible(layer);
              }}
              title={layer.visible ? "Hide" : "Show"}
            >
              {layer.visible ? "\u{1F441}" : "\u2014"}
            </button>
            {/* Lock toggle */}
            <button
              className={`text-[10px] ${layer.locked ? "text-[#f59e0b]" : "text-[#444]"} hover:text-white transition-colors`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLock(layer);
              }}
              title={layer.locked ? "Unlock" : "Lock"}
            >
              {layer.locked ? "\u{1F512}" : "\u{1F513}"}
            </button>
            {/* Remove */}
            <button
              className="opacity-0 group-hover:opacity-100 text-[#666] hover:text-red-400 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                removeLayer(selectedDeviceId, layer.id);
              }}
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* Add layer grid */}
      <div className="p-2 border-t border-[#2a2a4a]">
        <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2 px-1">
          Add Layer
        </div>
        <div className="grid grid-cols-5 gap-1">
          {ALL_LAYER_TYPES.map((type) => (
            <button
              key={type}
              className="text-[10px] text-[#aaa] hover:text-white py-1.5 rounded hover:bg-[#ffffff08] transition-colors flex flex-col items-center gap-0.5"
              onClick={() => {
                const layerData = createDefaultLayer(type);
                addLayer(selectedDeviceId, layerData as Omit<Layer, "id">);
              }}
              title={type}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: LAYER_TYPE_COLORS[type] }}
              />
              <span>{LAYER_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
