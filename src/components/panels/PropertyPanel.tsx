import { useSceneStore } from "../../stores/scene-store";
import type { Layer, Device, Vec3 } from "../../types/scene";

// ── Generic Inputs ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-1.5 px-1">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <label className="text-xs text-[#888] w-20 shrink-0 truncate">
        {label}
      </label>
      <input
        type="number"
        className="flex-1 bg-[#0a0a1a] border border-[#2a2a4a] rounded px-2 py-1 text-xs text-[#ccc] outline-none focus:border-[#7c7cff] transition-colors w-full"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <label className="text-xs text-[#888] w-20 shrink-0 truncate">
        {label}
      </label>
      <div className="flex items-center gap-1.5 flex-1">
        <input
          type="color"
          className="w-6 h-6 rounded border border-[#2a2a4a] cursor-pointer bg-transparent"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="flex-1 bg-[#0a0a1a] border border-[#2a2a4a] rounded px-2 py-1 text-xs text-[#ccc] outline-none focus:border-[#7c7cff] transition-colors"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <label className="text-xs text-[#888] w-20 shrink-0 truncate">
        {label}
      </label>
      <input
        type="text"
        className="flex-1 bg-[#0a0a1a] border border-[#2a2a4a] rounded px-2 py-1 text-xs text-[#ccc] outline-none focus:border-[#7c7cff] transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function BoolInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <label className="text-xs text-[#888] w-20 shrink-0 truncate">
        {label}
      </label>
      <button
        className={`w-8 h-4 rounded-full transition-colors ${value ? "bg-[#7c7cff]" : "bg-[#2a2a4a]"}`}
        onClick={() => onChange(!value)}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white transition-transform ${value ? "translate-x-4.5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

function Vec2Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <label className="text-xs text-[#888] w-20 shrink-0 truncate">
        {label}
      </label>
      <div className="flex gap-1 flex-1">
        <input
          type="number"
          className="flex-1 bg-[#0a0a1a] border border-[#2a2a4a] rounded px-2 py-1 text-xs text-[#ccc] outline-none focus:border-[#7c7cff] transition-colors"
          value={value[0]}
          step={1}
          onChange={(e) =>
            onChange([parseFloat(e.target.value) || 0, value[1]])
          }
          placeholder="X"
        />
        <input
          type="number"
          className="flex-1 bg-[#0a0a1a] border border-[#2a2a4a] rounded px-2 py-1 text-xs text-[#ccc] outline-none focus:border-[#7c7cff] transition-colors"
          value={value[1]}
          step={1}
          onChange={(e) =>
            onChange([value[0], parseFloat(e.target.value) || 0])
          }
          placeholder="Y"
        />
      </div>
    </div>
  );
}

// ── Property auto-renderer ──────────────────────────────────────────────────

function renderPropertyField(
  key: string,
  value: unknown,
  onChange: (newVal: unknown) => void
) {
  // Vec2 arrays: [number, number]
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return (
      <Vec2Input
        key={key}
        label={key}
        value={value as [number, number]}
        onChange={onChange}
      />
    );
  }

  // Number
  if (typeof value === "number") {
    return (
      <NumberInput
        key={key}
        label={key}
        value={value}
        step={value % 1 !== 0 ? 0.1 : 1}
        onChange={onChange}
      />
    );
  }

  // Color string
  if (typeof value === "string" && value.startsWith("#")) {
    return (
      <ColorInput key={key} label={key} value={value} onChange={onChange} />
    );
  }

  // Boolean
  if (typeof value === "boolean") {
    return (
      <BoolInput key={key} label={key} value={value} onChange={onChange} />
    );
  }

  // Regular string
  if (typeof value === "string") {
    return (
      <TextInput key={key} label={key} value={value} onChange={onChange} />
    );
  }

  // Null (optional string field)
  if (value === null) {
    return (
      <TextInput
        key={key}
        label={key}
        value=""
        onChange={(v) => onChange(v || null)}
      />
    );
  }

  // Object with x, y, width, height (region)
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    const obj = value as Record<string, unknown>;
    return (
      <div key={key} className="ml-2 border-l border-[#2a2a4a] pl-2">
        <div className="text-xs text-[#666] mb-1">{key}</div>
        {Object.entries(obj).map(([subKey, subVal]) =>
          renderPropertyField(subKey, subVal, (newSubVal) => {
            onChange({ ...obj, [subKey]: newSubVal });
          })
        )}
      </div>
    );
  }

  return null;
}

// ── Layer Properties ────────────────────────────────────────────────────────

function LayerProperties({
  layer,
  deviceId,
}: {
  layer: Layer;
  deviceId: string;
}) {
  const updateLayer = useSceneStore((s) => s.updateLayer);

  function handleUpdateName(name: string) {
    updateLayer(deviceId, layer.id, { name });
  }

  function handleUpdateTimeRange(timeRange: [number, number]) {
    updateLayer(deviceId, layer.id, { timeRange });
  }

  function handleUpdateProperty(key: string, value: unknown) {
    const updatedProperties = { ...layer.properties, [key]: value };
    // We need to cast because TS can't narrow through the spread
    updateLayer(deviceId, layer.id, {
      properties: updatedProperties,
    } as Partial<Layer>);
  }

  return (
    <div className="space-y-3">
      <Section title="Layer">
        <TextInput label="Name" value={layer.name} onChange={handleUpdateName} />
        <div className="flex items-center gap-2 px-1">
          <label className="text-xs text-[#888] w-20 shrink-0">Type</label>
          <span className="text-xs text-[#666]">{layer.type}</span>
        </div>
      </Section>

      <Section title="Time Range">
        <NumberInput
          label="Start"
          value={layer.timeRange[0]}
          step={0.1}
          min={0}
          onChange={(v) => handleUpdateTimeRange([v, layer.timeRange[1]])}
        />
        <NumberInput
          label="End"
          value={layer.timeRange[1]}
          step={0.1}
          min={0}
          onChange={(v) => handleUpdateTimeRange([layer.timeRange[0], v])}
        />
      </Section>

      <Section title="Properties">
        {Object.entries(layer.properties).map(([key, value]) =>
          renderPropertyField(key, value, (newVal) =>
            handleUpdateProperty(key, newVal)
          )
        )}
      </Section>
    </div>
  );
}

// ── Device Properties ───────────────────────────────────────────────────────

function DeviceProperties({ device }: { device: Device }) {
  const updateDevice = useSceneStore((s) => s.updateDevice);

  function handleVec3Change(
    field: "position" | "rotation" | "scale",
    index: number,
    value: number
  ) {
    const current = [...device[field]] as Vec3;
    current[index] = value;
    updateDevice(device.id, { [field]: current });
  }

  const labels = ["X", "Y", "Z"];

  return (
    <div className="space-y-3">
      <Section title="Device">
        <div className="flex items-center gap-2 px-1">
          <label className="text-xs text-[#888] w-20 shrink-0">Name</label>
          <span className="text-xs text-[#ccc] truncate">{device.name}</span>
        </div>
        <div className="flex items-center gap-2 px-1">
          <label className="text-xs text-[#888] w-20 shrink-0">Model</label>
          <span className="text-xs text-[#666]">{device.model}</span>
        </div>
      </Section>

      {(["position", "rotation", "scale"] as const).map((field) => (
        <Section key={field} title={field.charAt(0).toUpperCase() + field.slice(1)}>
          {labels.map((label, i) => (
            <NumberInput
              key={`${field}-${label}`}
              label={label}
              value={device[field][i]}
              step={field === "rotation" ? 1 : 0.1}
              onChange={(v) => handleVec3Change(field, i, v)}
            />
          ))}
        </Section>
      ))}
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export default function PropertyPanel() {
  const selectedDeviceId = useSceneStore((s) => s.editor.selectedDeviceId);
  const selectedLayerId = useSceneStore((s) => s.editor.selectedLayerId);
  const devices = useSceneStore((s) => s.scene.devices);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const selectedLayer = selectedDevice?.layers.find(
    (l) => l.id === selectedLayerId
  );

  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2 px-1">
        Properties
      </div>

      {selectedLayer && selectedDeviceId ? (
        <LayerProperties layer={selectedLayer} deviceId={selectedDeviceId} />
      ) : selectedDevice ? (
        <DeviceProperties device={selectedDevice} />
      ) : (
        <div className="text-xs text-[#555] px-1 py-2">
          Select a device or layer to edit properties.
        </div>
      )}
    </div>
  );
}
