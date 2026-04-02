import { create } from "zustand";
import type {
  Scene,
  EditorState,
  Device,
  Layer,
  ScreenContent,
  Keyframe,
  CameraKeyframe,
  EasingType,
} from "../types/scene";

// ── ID Generator ────────────────────────────────────────────────────────────

let counter = 0;
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

// ── Defaults ────────────────────────────────────────────────────────────────

function defaultScene(): Scene {
  return {
    version: 1,
    name: "Untitled Scene",
    canvas: {
      width: 1920,
      height: 1080,
      fps: 60,
      duration: 10,
      backgroundColor: "#1a1a2e",
    },
    devices: [],
    camera: {
      fov: 50,
      keyframes: [],
    },
    environment: {
      type: "studio",
      intensity: 1.0,
      background: "#1a1a2e",
    },
  };
}

function defaultEditor(): EditorState {
  return {
    selectedDeviceId: null,
    selectedLayerId: null,
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    snapInterval: 0.1,
  };
}

// ── Store Types ─────────────────────────────────────────────────────────────

type DeviceInput = Omit<Device, "id" | "layers" | "keyframes"> & {
  layers?: Layer[];
  keyframes?: Keyframe[];
};

type LayerInput = Omit<Layer, "id">;

type KeyframeInput = Omit<Keyframe, "id">;

export interface SceneStore {
  scene: Scene;
  editor: EditorState;

  // Scene operations
  resetScene: () => void;
  loadScene: (scene: Scene) => void;
  toJSON: () => string;

  // Device operations
  addDevice: (input: DeviceInput) => string;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  setScreenContent: (deviceId: string, content: ScreenContent | null) => void;

  // Layer operations
  addLayer: (deviceId: string, input: LayerInput) => string;
  removeLayer: (deviceId: string, layerId: string) => void;
  updateLayer: (
    deviceId: string,
    layerId: string,
    updates: Partial<Layer>
  ) => void;
  reorderLayers: (deviceId: string, layerIds: string[]) => void;

  // Keyframe operations
  addDeviceKeyframe: (deviceId: string, input: KeyframeInput) => string;
  removeDeviceKeyframe: (deviceId: string, kfId: string) => void;
  addCameraKeyframe: (kf: CameraKeyframe) => void;

  // Editor operations
  selectDevice: (id: string | null) => void;
  selectLayer: (id: string | null) => void;
  setCurrentTime: (t: number) => void;
  setPlaying: (playing: boolean) => void;
}

// ── Helper ──────────────────────────────────────────────────────────────────

function updateDeviceInList(
  devices: Device[],
  deviceId: string,
  updater: (device: Device) => Device
): Device[] {
  return devices.map((d) => (d.id === deviceId ? updater(d) : d));
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useSceneStore = create<SceneStore>((set, get) => ({
  scene: defaultScene(),
  editor: defaultEditor(),

  // ── Scene operations ────────────────────────────────────────────────────

  resetScene: () =>
    set({ scene: defaultScene(), editor: defaultEditor() }),

  loadScene: (scene: Scene) =>
    set({ scene, editor: defaultEditor() }),

  toJSON: () => JSON.stringify(get().scene),

  // ── Device operations ───────────────────────────────────────────────────

  addDevice: (input: DeviceInput) => {
    const id = genId("dev");
    const device: Device = {
      ...input,
      id,
      layers: input.layers ?? [],
      keyframes: input.keyframes ?? [],
    };
    set((state) => ({
      scene: {
        ...state.scene,
        devices: [...state.scene.devices, device],
      },
    }));
    return id;
  },

  removeDevice: (id: string) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: state.scene.devices.filter((d) => d.id !== id),
      },
      editor:
        state.editor.selectedDeviceId === id
          ? { ...state.editor, selectedDeviceId: null, selectedLayerId: null }
          : state.editor,
    })),

  updateDevice: (id: string, updates: Partial<Device>) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: updateDeviceInList(state.scene.devices, id, (d) => ({
          ...d,
          ...updates,
          id: d.id, // preserve id
        })),
      },
    })),

  setScreenContent: (deviceId: string, content: ScreenContent | null) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: updateDeviceInList(state.scene.devices, deviceId, (d) => ({
          ...d,
          screenContent: content,
        })),
      },
    })),

  // ── Layer operations ────────────────────────────────────────────────────

  addLayer: (deviceId: string, input: LayerInput) => {
    const id = genId("layer");
    const layer = { ...input, id } as Layer;
    set((state) => ({
      scene: {
        ...state.scene,
        devices: updateDeviceInList(state.scene.devices, deviceId, (d) => ({
          ...d,
          layers: [...d.layers, layer],
        })),
      },
    }));
    return id;
  },

  removeLayer: (deviceId: string, layerId: string) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: updateDeviceInList(state.scene.devices, deviceId, (d) => ({
          ...d,
          layers: d.layers.filter((l) => l.id !== layerId),
        })),
      },
      editor:
        state.editor.selectedLayerId === layerId
          ? { ...state.editor, selectedLayerId: null }
          : state.editor,
    })),

  updateLayer: (
    deviceId: string,
    layerId: string,
    updates: Partial<Layer>
  ) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: updateDeviceInList(state.scene.devices, deviceId, (d) => ({
          ...d,
          layers: d.layers.map((l) =>
            l.id === layerId ? ({ ...l, ...updates, id: l.id } as Layer) : l
          ),
        })),
      },
    })),

  reorderLayers: (deviceId: string, layerIds: string[]) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: updateDeviceInList(state.scene.devices, deviceId, (d) => {
          const layerMap = new Map(d.layers.map((l) => [l.id, l]));
          const reordered = layerIds
            .map((id) => layerMap.get(id))
            .filter((l): l is Layer => l !== undefined);
          return { ...d, layers: reordered };
        }),
      },
    })),

  // ── Keyframe operations ─────────────────────────────────────────────────

  addDeviceKeyframe: (deviceId: string, input: KeyframeInput) => {
    const id = genId("kf");
    const kf: Keyframe = { ...input, id };
    set((state) => ({
      scene: {
        ...state.scene,
        devices: updateDeviceInList(state.scene.devices, deviceId, (d) => ({
          ...d,
          keyframes: [...d.keyframes, kf],
        })),
      },
    }));
    return id;
  },

  removeDeviceKeyframe: (deviceId: string, kfId: string) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: updateDeviceInList(state.scene.devices, deviceId, (d) => ({
          ...d,
          keyframes: d.keyframes.filter((k) => k.id !== kfId),
        })),
      },
    })),

  addCameraKeyframe: (kf: CameraKeyframe) =>
    set((state) => ({
      scene: {
        ...state.scene,
        camera: {
          ...state.scene.camera,
          keyframes: [...state.scene.camera.keyframes, kf],
        },
      },
    })),

  // ── Editor operations ───────────────────────────────────────────────────

  selectDevice: (id: string | null) =>
    set((state) => ({
      editor: { ...state.editor, selectedDeviceId: id },
    })),

  selectLayer: (id: string | null) =>
    set((state) => ({
      editor: { ...state.editor, selectedLayerId: id },
    })),

  setCurrentTime: (t: number) =>
    set((state) => ({
      editor: { ...state.editor, currentTime: t },
    })),

  setPlaying: (playing: boolean) =>
    set((state) => ({
      editor: { ...state.editor, isPlaying: playing },
    })),
}));
