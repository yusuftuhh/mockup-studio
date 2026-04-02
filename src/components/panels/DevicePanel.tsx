import { useSceneStore } from "../../stores/scene-store";
import { getAllDevices, type DeviceCategory } from "../../lib/device-catalog";

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  phone: "Phones",
  tablet: "Tablets",
  laptop: "Laptops",
  desktop: "Desktops",
  watch: "Watches",
};

const CATEGORY_ICONS: Record<DeviceCategory, string> = {
  phone: "\u{1F4F1}",
  tablet: "\u{1F4CB}",
  laptop: "\u{1F4BB}",
  desktop: "\u{1F5A5}",
  watch: "\u231A",
};

export default function DevicePanel() {
  const devices = useSceneStore((s) => s.scene.devices);
  const selectedDeviceId = useSceneStore((s) => s.editor.selectedDeviceId);
  const selectDevice = useSceneStore((s) => s.selectDevice);
  const selectLayer = useSceneStore((s) => s.selectLayer);
  const removeDevice = useSceneStore((s) => s.removeDevice);
  const addDevice = useSceneStore((s) => s.addDevice);

  const catalog = getAllDevices();
  const grouped = catalog.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = [];
      acc[entry.category].push(entry);
      return acc;
    },
    {} as Record<string, typeof catalog>
  );

  function handleAddDevice(model: string) {
    const entry = catalog.find((e) => e.model === model);
    if (!entry) return;
    addDevice({
      name: entry.name,
      type: "procedural",
      model: entry.model,
      proceduralParams: { ...entry.proceduralParams },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      screenContent: null,
    });
  }

  function handleSelect(id: string) {
    selectDevice(id);
    selectLayer(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Device list */}
      <div className="p-2 border-b border-[#2a2a4a]">
        <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2 px-1">
          Devices
        </div>
        {devices.length === 0 && (
          <div className="text-xs text-[#555] px-1 py-2">
            No devices. Add one below.
          </div>
        )}
        {devices.map((device) => (
          <div
            key={device.id}
            className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer group ${
              selectedDeviceId === device.id
                ? "bg-[#7c7cff]/20 text-[#7c7cff]"
                : "text-[#ccc] hover:bg-[#ffffff08]"
            }`}
            onClick={() => handleSelect(device.id)}
          >
            <span className="truncate">{device.name}</span>
            <button
              className="opacity-0 group-hover:opacity-100 text-[#666] hover:text-red-400 transition-opacity ml-2"
              onClick={(e) => {
                e.stopPropagation();
                removeDevice(device.id);
              }}
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* Add device catalog */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2 px-1">
          Add Device
        </div>
        {(Object.keys(grouped) as DeviceCategory[]).map((category) => (
          <div key={category} className="mb-3">
            <div className="text-xs text-[#666] px-1 mb-1">
              {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]}
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {grouped[category].map((entry) => (
                <button
                  key={entry.model}
                  className="text-left text-xs text-[#aaa] hover:text-white hover:bg-[#ffffff08] px-2 py-1 rounded transition-colors truncate"
                  onClick={() => handleAddDevice(entry.model)}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
