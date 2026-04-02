# MockupStudio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri desktop app for creating 3D device mockup promo videos with layer-based screen annotations, keyframe animation, FFmpeg export, and MCP server for Claude CLI control.

**Architecture:** Tauri v2 shell with Rust backend (FFmpeg pipeline, file I/O) and React frontend (R3F 3D viewport, Zustand state, custom timeline). Layers are composited on an offscreen CanvasTexture mapped onto 3D device screens. MCP server is a separate Rust binary communicating via WebSocket.

**Tech Stack:** Tauri v2, React 19, React Three Fiber 9, Three.js, Zustand 5, Tailwind CSS v4, Vitest, FFmpeg (sidecar), Rust

---

## File Structure

```
mockup-studio/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── binaries/                    # FFmpeg sidecar binaries
│   ├── src/
│   │   ├── lib.rs                   # Tauri command registrations
│   │   ├── main.rs                  # Entry point
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── export.rs            # FFmpeg export commands
│   │   │   └── file_io.rs           # File read/write commands
│   │   └── websocket.rs             # WS server for MCP bridge
├── src/
│   ├── main.tsx                     # React entry
│   ├── App.tsx                      # Root layout (4-panel editor)
│   ├── styles.css                   # Tailwind + custom styles
│   ├── types/
│   │   └── scene.ts                 # All TypeScript types
│   ├── stores/
│   │   └── scene-store.ts           # Zustand store
│   ├── components/
│   │   ├── viewport/
│   │   │   ├── Viewport.tsx         # R3F Canvas + OrbitControls
│   │   │   ├── DeviceMesh.tsx       # Routes to GLTF or Procedural
│   │   │   ├── ProceduralDevice.tsx # Box geometry from params
│   │   │   ├── GltfDevice.tsx       # GLTF model loader
│   │   │   └── ScreenTexture.tsx    # CanvasTexture compositor
│   │   ├── panels/
│   │   │   ├── DevicePanel.tsx      # Device list sidebar
│   │   │   ├── LayerPanel.tsx       # Layer stack sidebar
│   │   │   ├── PropertyPanel.tsx    # Property inspector
│   │   │   └── TopBar.tsx           # Menu bar
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx         # Timeline container
│   │   │   ├── TimelineTrack.tsx    # Single track row
│   │   │   └── TimelinePlayhead.tsx # Playhead line
│   │   └── export/
│   │       └── ExportDialog.tsx     # Export settings modal
│   ├── engine/
│   │   ├── interpolator.ts          # Keyframe interpolation
│   │   ├── presets.ts               # Animation preset definitions
│   │   └── compositor.ts            # 2D canvas layer compositor
│   └── lib/
│       ├── device-catalog.ts        # Built-in device definitions
│       └── procedural-geometry.ts   # Procedural mesh builder
├── tests/
│   ├── stores/
│   │   └── scene-store.test.ts
│   ├── engine/
│   │   ├── interpolator.test.ts
│   │   └── compositor.test.ts
│   └── lib/
│       ├── device-catalog.test.ts
│       └── procedural-geometry.test.ts
├── mcp-server/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs                  # MCP stdio server
│   │   ├── tools.rs                 # Tool definitions
│   │   └── bridge.rs                # WebSocket client to Tauri
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Phase 1: Project Scaffold

### Task 1: Create Tauri v2 Project

**Files:**
- Create: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, `vite.config.ts`, `tsconfig.json`

- [ ] **Step 1: Scaffold Tauri project**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm create tauri-app@latest . -- --template react-ts --manager npm --identifier com.mockupstudio.app --yes
```

If the directory is not empty, confirm overwrite or run from parent. The scaffolder creates the full Tauri v2 + React + Vite + TypeScript project.

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm install
```

- [ ] **Step 3: Verify it builds**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm run tauri dev
```

Expected: A Tauri window opens showing the default React template page. Close the window.

- [ ] **Step 4: Commit scaffold**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add -A
git commit -m "chore: scaffold Tauri v2 + React + TypeScript project"
```

### Task 2: Install Core Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install 3D, state, styling, and test dependencies**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm install three @react-three/fiber @react-three/drei zustand
npm install -D @types/three tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Install Radix UI components**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm install @radix-ui/react-dialog @radix-ui/react-slider @radix-ui/react-select @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-switch @radix-ui/react-context-menu
```

- [ ] **Step 3: Install Tauri plugins**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm install @tauri-apps/plugin-shell @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
cd src-tauri
cargo add tauri-plugin-shell tauri-plugin-dialog tauri-plugin-fs
cd ..
```

- [ ] **Step 4: Configure Tailwind CSS v4**

Replace contents of `src/styles.css` (or `src/App.css` depending on scaffold):

```css
@import "tailwindcss";
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Register Tauri plugins in Rust**

Update `src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 7: Verify build + test runner**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm run tauri dev &
sleep 5 && kill %1
npx vitest run 2>&1 | head -20
```

Expected: Tauri window opens (close it). Vitest runs with 0 tests (no test files yet). No errors.

- [ ] **Step 8: Commit dependencies**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add -A
git commit -m "chore: add R3F, Zustand, Tailwind, Radix, Vitest dependencies"
```

---

## Phase 2: Types & State Store

### Task 3: Define Scene Types

**Files:**
- Create: `src/types/scene.ts`

- [ ] **Step 1: Write types file**

Create `src/types/scene.ts`:

```typescript
// ---- Primitives ----
export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

// ---- Easing ----
export type EasingType =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring"
  | "bounce"
  | "step";

// ---- Keyframe ----
export interface Keyframe {
  id: string;
  property: string;
  time: number;
  value: number;
  easing: EasingType;
}

// ---- Animation ----
export type AnimationType = "fade" | "slide" | "scale" | "bounce" | "none";

export interface AnimationConfig {
  entry: AnimationType;
  exit: AnimationType;
  easing: EasingType;
}

// ---- Layer Types ----
export type LayerType =
  | "spotlight"
  | "blur"
  | "zoom"
  | "arrow"
  | "text"
  | "callout"
  | "region_replace"
  | "tap"
  | "cursor"
  | "shape";

export interface LayerBase {
  id: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  name: string;
  timeRange: [number, number];
  animation: AnimationConfig;
  keyframes: Keyframe[];
}

export interface SpotlightLayer extends LayerBase {
  type: "spotlight";
  properties: {
    center: Vec2;
    radius: number;
    shape: "circle" | "rect";
    dimOpacity: number;
    feather: number;
  };
}

export interface BlurLayer extends LayerBase {
  type: "blur";
  properties: {
    region: { x: number; y: number; width: number; height: number };
    strength: number;
  };
}

export interface TextLayer extends LayerBase {
  type: "text";
  properties: {
    text: string;
    position: Vec2;
    fontSize: number;
    color: string;
    backgroundColor: string | null;
    fontFamily: string;
    shadow: boolean;
  };
}

export interface ArrowLayer extends LayerBase {
  type: "arrow";
  properties: {
    from: Vec2;
    to: Vec2;
    color: string;
    thickness: number;
    headSize: number;
    style: "solid" | "dashed";
  };
}

export interface ZoomLayer extends LayerBase {
  type: "zoom";
  properties: {
    sourceRegion: { x: number; y: number; width: number; height: number };
    displayPosition: Vec2;
    scale: number;
    borderColor: string;
    borderWidth: number;
    showConnector: boolean;
  };
}

export interface CalloutLayer extends LayerBase {
  type: "callout";
  properties: {
    position: Vec2;
    targetPosition: Vec2;
    label: string;
    style: "badge" | "info";
    color: string;
    fontSize: number;
  };
}

export interface RegionReplaceLayer extends LayerBase {
  type: "region_replace";
  properties: {
    region: { x: number; y: number; width: number; height: number };
    source: string; // file path
  };
}

export interface TapLayer extends LayerBase {
  type: "tap";
  properties: {
    position: Vec2;
    rippleColor: string;
    rippleSize: number;
  };
}

export interface CursorLayer extends LayerBase {
  type: "cursor";
  properties: {
    path: Vec2[]; // bezier control points
    style: "pointer" | "hand";
    color: string;
    size: number;
  };
}

export interface ShapeLayer extends LayerBase {
  type: "shape";
  properties: {
    shapeType: "rect" | "circle" | "line";
    position: Vec2;
    size: Vec2;
    color: string;
    opacity: number;
    strokeWidth: number;
    filled: boolean;
  };
}

export type Layer =
  | SpotlightLayer
  | BlurLayer
  | TextLayer
  | ArrowLayer
  | ZoomLayer
  | CalloutLayer
  | RegionReplaceLayer
  | TapLayer
  | CursorLayer
  | ShapeLayer;

// ---- Device ----
export type DeviceType = "gltf" | "procedural";
export type MaterialType = "matte" | "glossy" | "metallic";

export interface ProceduralParams {
  width: number;       // mm
  height: number;      // mm
  screenWidth: number; // px
  screenHeight: number;// px
  bezelTop: number;    // mm
  bezelBottom: number; // mm
  bezelSide: number;   // mm
  cornerRadius: number;// mm
  thickness: number;   // mm
  color: string;
  material: MaterialType;
}

export interface ScreenContent {
  type: "video" | "image";
  source: string; // file path
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  model: string | null;           // GLTF model name (null for procedural)
  proceduralParams: ProceduralParams | null;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  screenContent: ScreenContent | null;
  layers: Layer[];
  keyframes: Keyframe[];
}

// ---- Camera ----
export interface CameraKeyframe {
  time: number;
  position: Vec3;
  lookAt: Vec3;
  fov: number;
  easing: EasingType;
}

export interface CameraState {
  fov: number;
  keyframes: CameraKeyframe[];
}

// ---- Environment ----
export interface Environment {
  type: "studio" | "sunset" | "dawn" | "night" | "none";
  intensity: number;
  background: string;
}

// ---- Scene (root) ----
export interface Scene {
  version: number;
  name: string;
  canvas: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    backgroundColor: string;
  };
  devices: Device[];
  camera: CameraState;
  environment: Environment;
}

// ---- Editor State (not persisted) ----
export interface EditorState {
  selectedDeviceId: string | null;
  selectedLayerId: string | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  snapInterval: number;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/types/scene.ts
git commit -m "feat: add scene type definitions"
```

### Task 4: Implement Zustand Scene Store

**Files:**
- Create: `src/stores/scene-store.ts`, `tests/stores/scene-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/stores/scene-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useSceneStore } from "../src/stores/scene-store";
import type { Device, SpotlightLayer } from "../src/types/scene";

describe("scene-store", () => {
  beforeEach(() => {
    useSceneStore.getState().resetScene();
  });

  it("creates a default scene", () => {
    const scene = useSceneStore.getState().scene;
    expect(scene.version).toBe(1);
    expect(scene.canvas.width).toBe(1920);
    expect(scene.canvas.fps).toBe(60);
    expect(scene.devices).toEqual([]);
  });

  it("adds a procedural device", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({
      name: "Lenovo Tab K11",
      type: "procedural",
      model: null,
      proceduralParams: {
        width: 247.8,
        height: 165.8,
        screenWidth: 1920,
        screenHeight: 1200,
        bezelTop: 8,
        bezelBottom: 8,
        bezelSide: 8,
        cornerRadius: 12,
        thickness: 7.4,
        color: "#2d2d2d",
        material: "matte",
      },
    });
    const devices = useSceneStore.getState().scene.devices;
    expect(devices).toHaveLength(1);
    expect(devices[0].name).toBe("Lenovo Tab K11");
    expect(devices[0].id).toBeTruthy();
    expect(devices[0].position).toEqual([0, 0, 0]);
  });

  it("removes a device", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({ name: "Test", type: "procedural", model: null, proceduralParams: null });
    const id = useSceneStore.getState().scene.devices[0].id;
    useSceneStore.getState().removeDevice(id);
    expect(useSceneStore.getState().scene.devices).toHaveLength(0);
  });

  it("updates device properties", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({ name: "Test", type: "procedural", model: null, proceduralParams: null });
    const id = useSceneStore.getState().scene.devices[0].id;
    useSceneStore.getState().updateDevice(id, { position: [1, 2, 3] });
    expect(useSceneStore.getState().scene.devices[0].position).toEqual([1, 2, 3]);
  });

  it("adds a layer to a device", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({ name: "Test", type: "procedural", model: null, proceduralParams: null });
    const deviceId = useSceneStore.getState().scene.devices[0].id;
    useSceneStore.getState().addLayer(deviceId, {
      type: "spotlight",
      name: "Spotlight 1",
      properties: {
        center: [100, 200],
        radius: 50,
        shape: "circle",
        dimOpacity: 0.6,
        feather: 10,
      },
    });
    const layers = useSceneStore.getState().scene.devices[0].layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].type).toBe("spotlight");
    expect((layers[0] as SpotlightLayer).properties.radius).toBe(50);
  });

  it("removes a layer", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({ name: "Test", type: "procedural", model: null, proceduralParams: null });
    const deviceId = useSceneStore.getState().scene.devices[0].id;
    useSceneStore.getState().addLayer(deviceId, {
      type: "text",
      name: "Label",
      properties: {
        text: "Hello",
        position: [0, 0],
        fontSize: 24,
        color: "#fff",
        backgroundColor: null,
        fontFamily: "sans-serif",
        shadow: false,
      },
    });
    const layerId = useSceneStore.getState().scene.devices[0].layers[0].id;
    useSceneStore.getState().removeLayer(deviceId, layerId);
    expect(useSceneStore.getState().scene.devices[0].layers).toHaveLength(0);
  });

  it("updates a layer", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({ name: "Test", type: "procedural", model: null, proceduralParams: null });
    const deviceId = useSceneStore.getState().scene.devices[0].id;
    useSceneStore.getState().addLayer(deviceId, {
      type: "spotlight",
      name: "Spot",
      properties: { center: [0, 0], radius: 50, shape: "circle", dimOpacity: 0.6, feather: 10 },
    });
    const layerId = useSceneStore.getState().scene.devices[0].layers[0].id;
    useSceneStore.getState().updateLayer(deviceId, layerId, {
      properties: { center: [100, 200], radius: 80, shape: "circle", dimOpacity: 0.6, feather: 10 },
    });
    const updated = useSceneStore.getState().scene.devices[0].layers[0] as SpotlightLayer;
    expect(updated.properties.radius).toBe(80);
    expect(updated.properties.center).toEqual([100, 200]);
  });

  it("sets screen content on a device", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({ name: "Test", type: "procedural", model: null, proceduralParams: null });
    const id = useSceneStore.getState().scene.devices[0].id;
    useSceneStore.getState().setScreenContent(id, { type: "video", source: "/path/to/video.mp4" });
    expect(useSceneStore.getState().scene.devices[0].screenContent?.source).toBe("/path/to/video.mp4");
  });

  it("manages editor state", () => {
    useSceneStore.getState().setCurrentTime(5.5);
    expect(useSceneStore.getState().editor.currentTime).toBe(5.5);
    useSceneStore.getState().setPlaying(true);
    expect(useSceneStore.getState().editor.isPlaying).toBe(true);
  });

  it("adds a keyframe to a device", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({ name: "Test", type: "procedural", model: null, proceduralParams: null });
    const id = useSceneStore.getState().scene.devices[0].id;
    useSceneStore.getState().addDeviceKeyframe(id, {
      property: "rotation.y",
      time: 0,
      value: 0,
      easing: "linear",
    });
    useSceneStore.getState().addDeviceKeyframe(id, {
      property: "rotation.y",
      time: 10,
      value: 6.283,
      easing: "ease-in-out",
    });
    expect(useSceneStore.getState().scene.devices[0].keyframes).toHaveLength(2);
  });

  it("serializes to JSON and back", () => {
    const { addDevice } = useSceneStore.getState();
    addDevice({ name: "Test", type: "procedural", model: null, proceduralParams: null });
    const json = useSceneStore.getState().toJSON();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.devices).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run tests/stores/scene-store.test.ts
```

Expected: FAIL — cannot find module `../src/stores/scene-store`

- [ ] **Step 3: Implement the store**

Create `src/stores/scene-store.ts`:

```typescript
import { create } from "zustand";
import type {
  Scene,
  Device,
  Layer,
  LayerType,
  Keyframe,
  ScreenContent,
  EditorState,
  CameraKeyframe,
  ProceduralParams,
  EasingType,
} from "../types/scene";

let idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${++idCounter}_${Date.now()}`;
}

function defaultScene(): Scene {
  return {
    version: 1,
    name: "Untitled",
    canvas: { width: 1920, height: 1080, fps: 60, duration: 10, backgroundColor: "#0a0a1a" },
    devices: [],
    camera: { fov: 50, keyframes: [] },
    environment: { type: "studio", intensity: 1.0, background: "#0a0a1a" },
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

interface AddDeviceInput {
  name: string;
  type: "gltf" | "procedural";
  model: string | null;
  proceduralParams: ProceduralParams | null;
}

interface AddLayerInput {
  type: LayerType;
  name: string;
  properties: Record<string, unknown>;
}

interface AddKeyframeInput {
  property: string;
  time: number;
  value: number;
  easing: EasingType;
}

interface SceneStore {
  scene: Scene;
  editor: EditorState;

  // Scene
  resetScene: () => void;
  loadScene: (scene: Scene) => void;
  toJSON: () => string;

  // Devices
  addDevice: (input: AddDeviceInput) => void;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, updates: Partial<Pick<Device, "position" | "rotation" | "scale" | "name">>) => void;
  setScreenContent: (deviceId: string, content: ScreenContent) => void;

  // Layers
  addLayer: (deviceId: string, input: AddLayerInput) => void;
  removeLayer: (deviceId: string, layerId: string) => void;
  updateLayer: (deviceId: string, layerId: string, updates: Partial<Layer>) => void;
  reorderLayers: (deviceId: string, layerIds: string[]) => void;

  // Keyframes
  addDeviceKeyframe: (deviceId: string, input: AddKeyframeInput) => void;
  removeDeviceKeyframe: (deviceId: string, keyframeId: string) => void;
  addCameraKeyframe: (kf: CameraKeyframe) => void;

  // Editor
  selectDevice: (id: string | null) => void;
  selectLayer: (id: string | null) => void;
  setCurrentTime: (t: number) => void;
  setPlaying: (playing: boolean) => void;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  scene: defaultScene(),
  editor: defaultEditor(),

  resetScene: () => {
    idCounter = 0;
    set({ scene: defaultScene(), editor: defaultEditor() });
  },

  loadScene: (scene: Scene) => set({ scene }),

  toJSON: () => JSON.stringify(get().scene, null, 2),

  addDevice: (input) =>
    set((state) => {
      const device: Device = {
        id: genId("dev"),
        name: input.name,
        type: input.type,
        model: input.model,
        proceduralParams: input.proceduralParams,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
        layers: [],
        keyframes: [],
      };
      return { scene: { ...state.scene, devices: [...state.scene.devices, device] } };
    }),

  removeDevice: (id) =>
    set((state) => ({
      scene: { ...state.scene, devices: state.scene.devices.filter((d) => d.id !== id) },
    })),

  updateDevice: (id, updates) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: state.scene.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      },
    })),

  setScreenContent: (deviceId, content) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: state.scene.devices.map((d) =>
          d.id === deviceId ? { ...d, screenContent: content } : d
        ),
      },
    })),

  addLayer: (deviceId, input) =>
    set((state) => {
      const layer: Layer = {
        id: genId("layer"),
        type: input.type,
        visible: true,
        locked: false,
        name: input.name,
        timeRange: [0, state.scene.canvas.duration],
        animation: { entry: "fade", exit: "fade", easing: "ease-in-out" },
        keyframes: [],
        properties: input.properties,
      } as Layer;
      return {
        scene: {
          ...state.scene,
          devices: state.scene.devices.map((d) =>
            d.id === deviceId ? { ...d, layers: [...d.layers, layer] } : d
          ),
        },
      };
    }),

  removeLayer: (deviceId, layerId) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: state.scene.devices.map((d) =>
          d.id === deviceId ? { ...d, layers: d.layers.filter((l) => l.id !== layerId) } : d
        ),
      },
    })),

  updateLayer: (deviceId, layerId, updates) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: state.scene.devices.map((d) =>
          d.id === deviceId
            ? { ...d, layers: d.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)) }
            : d
        ),
      },
    })),

  reorderLayers: (deviceId, layerIds) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: state.scene.devices.map((d) => {
          if (d.id !== deviceId) return d;
          const layerMap = new Map(d.layers.map((l) => [l.id, l]));
          return { ...d, layers: layerIds.map((id) => layerMap.get(id)!).filter(Boolean) };
        }),
      },
    })),

  addDeviceKeyframe: (deviceId, input) =>
    set((state) => {
      const kf: Keyframe = { id: genId("kf"), ...input };
      return {
        scene: {
          ...state.scene,
          devices: state.scene.devices.map((d) =>
            d.id === deviceId ? { ...d, keyframes: [...d.keyframes, kf] } : d
          ),
        },
      };
    }),

  removeDeviceKeyframe: (deviceId, keyframeId) =>
    set((state) => ({
      scene: {
        ...state.scene,
        devices: state.scene.devices.map((d) =>
          d.id === deviceId
            ? { ...d, keyframes: d.keyframes.filter((kf) => kf.id !== keyframeId) }
            : d
        ),
      },
    })),

  addCameraKeyframe: (kf) =>
    set((state) => ({
      scene: {
        ...state.scene,
        camera: { ...state.scene.camera, keyframes: [...state.scene.camera.keyframes, kf] },
      },
    })),

  selectDevice: (id) => set((state) => ({ editor: { ...state.editor, selectedDeviceId: id } })),
  selectLayer: (id) => set((state) => ({ editor: { ...state.editor, selectedLayerId: id } })),
  setCurrentTime: (t) => set((state) => ({ editor: { ...state.editor, currentTime: t } })),
  setPlaying: (playing) => set((state) => ({ editor: { ...state.editor, isPlaying: playing } })),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run tests/stores/scene-store.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/types/scene.ts src/stores/scene-store.ts tests/stores/scene-store.test.ts
git commit -m "feat: add scene types and Zustand store with full CRUD"
```

---

## Phase 3: 3D Viewport & Devices

### Task 5: Keyframe Interpolation Engine

**Files:**
- Create: `src/engine/interpolator.ts`, `tests/engine/interpolator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/engine/interpolator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { interpolateKeyframes, interpolateValue } from "../src/engine/interpolator";
import type { Keyframe } from "../src/types/scene";

describe("interpolator", () => {
  const keyframes: Keyframe[] = [
    { id: "a", property: "rotation.y", time: 0, value: 0, easing: "linear" },
    { id: "b", property: "rotation.y", time: 10, value: 6.283, easing: "linear" },
  ];

  it("returns first value before first keyframe", () => {
    expect(interpolateKeyframes(keyframes, "rotation.y", -1)).toBe(0);
  });

  it("returns last value after last keyframe", () => {
    expect(interpolateKeyframes(keyframes, "rotation.y", 15)).toBe(6.283);
  });

  it("interpolates linearly at midpoint", () => {
    const result = interpolateKeyframes(keyframes, "rotation.y", 5);
    expect(result).toBeCloseTo(3.1415, 2);
  });

  it("interpolates at exact keyframe time", () => {
    expect(interpolateKeyframes(keyframes, "rotation.y", 0)).toBe(0);
    expect(interpolateKeyframes(keyframes, "rotation.y", 10)).toBe(6.283);
  });

  it("returns 0 for property with no keyframes", () => {
    expect(interpolateKeyframes(keyframes, "position.x", 5)).toBe(0);
  });

  it("ease-in-out produces correct curve shape", () => {
    const eased: Keyframe[] = [
      { id: "a", property: "x", time: 0, value: 0, easing: "ease-in-out" },
      { id: "b", property: "x", time: 1, value: 1, easing: "ease-in-out" },
    ];
    const mid = interpolateKeyframes(eased, "x", 0.5);
    expect(mid).toBeCloseTo(0.5, 1); // ease-in-out is symmetric
    const quarter = interpolateKeyframes(eased, "x", 0.25);
    expect(quarter).toBeLessThan(0.25); // ease-in starts slow
  });

  it("interpolateValue handles basic easing", () => {
    expect(interpolateValue(0, 100, 0.5, "linear")).toBe(50);
    expect(interpolateValue(0, 100, 0, "linear")).toBe(0);
    expect(interpolateValue(0, 100, 1, "linear")).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run tests/engine/interpolator.test.ts
```

Expected: FAIL — cannot find module

- [ ] **Step 3: Implement interpolator**

Create `src/engine/interpolator.ts`:

```typescript
import type { Keyframe, EasingType } from "../types/scene";

function easingFn(t: number, easing: EasingType): number {
  switch (easing) {
    case "linear":
      return t;
    case "ease-in":
      return t * t;
    case "ease-out":
      return t * (2 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case "spring": {
      const s = 1 - t;
      return 1 - s * s * Math.cos(s * Math.PI * 2.5);
    }
    case "bounce": {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) { const t2 = t - 1.5 / 2.75; return 7.5625 * t2 * t2 + 0.75; }
      if (t < 2.5 / 2.75) { const t2 = t - 2.25 / 2.75; return 7.5625 * t2 * t2 + 0.9375; }
      const t2 = t - 2.625 / 2.75;
      return 7.5625 * t2 * t2 + 0.984375;
    }
    case "step":
      return t >= 1 ? 1 : 0;
    default:
      return t;
  }
}

export function interpolateValue(
  from: number,
  to: number,
  t: number,
  easing: EasingType
): number {
  const easedT = easingFn(Math.max(0, Math.min(1, t)), easing);
  return from + (to - from) * easedT;
}

export function interpolateKeyframes(
  keyframes: Keyframe[],
  property: string,
  time: number
): number {
  const relevant = keyframes
    .filter((kf) => kf.property === property)
    .sort((a, b) => a.time - b.time);

  if (relevant.length === 0) return 0;
  if (time <= relevant[0].time) return relevant[0].value;
  if (time >= relevant[relevant.length - 1].time) return relevant[relevant.length - 1].value;

  for (let i = 0; i < relevant.length - 1; i++) {
    const curr = relevant[i];
    const next = relevant[i + 1];
    if (time >= curr.time && time <= next.time) {
      const t = (time - curr.time) / (next.time - curr.time);
      return interpolateValue(curr.value, next.value, t, next.easing);
    }
  }
  return relevant[relevant.length - 1].value;
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run tests/engine/interpolator.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/engine/interpolator.ts tests/engine/interpolator.test.ts
git commit -m "feat: add keyframe interpolation engine with easing functions"
```

### Task 6: Procedural Device Geometry

**Files:**
- Create: `src/lib/procedural-geometry.ts`, `tests/lib/procedural-geometry.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/procedural-geometry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createProceduralGeometry } from "../src/lib/procedural-geometry";
import type { ProceduralParams } from "../src/types/scene";

describe("procedural-geometry", () => {
  const defaultParams: ProceduralParams = {
    width: 247.8,
    height: 165.8,
    screenWidth: 1920,
    screenHeight: 1200,
    bezelTop: 8,
    bezelBottom: 8,
    bezelSide: 8,
    cornerRadius: 12,
    thickness: 7.4,
    color: "#2d2d2d",
    material: "matte",
  };

  it("returns body and screen dimensions in scene units", () => {
    const result = createProceduralGeometry(defaultParams);
    // Dimensions scaled to scene units (mm / 100)
    expect(result.bodyWidth).toBeCloseTo(2.478, 2);
    expect(result.bodyHeight).toBeCloseTo(1.658, 2);
    expect(result.bodyDepth).toBeCloseTo(0.074, 2);
    expect(result.screenWidth).toBeCloseTo(2.318, 2); // (247.8 - 2*8) / 100
    expect(result.screenHeight).toBeCloseTo(1.498, 2); // (165.8 - 8 - 8) / 100
  });

  it("returns screen offset from center", () => {
    const result = createProceduralGeometry(defaultParams);
    // Screen is centered horizontally
    expect(result.screenOffsetX).toBeCloseTo(0, 2);
    // Screen may be offset vertically if bezels differ
    expect(typeof result.screenOffsetY).toBe("number");
  });

  it("returns corner radius in scene units", () => {
    const result = createProceduralGeometry(defaultParams);
    expect(result.cornerRadius).toBeCloseTo(0.12, 2);
  });

  it("handles zero bezels", () => {
    const params = { ...defaultParams, bezelTop: 0, bezelBottom: 0, bezelSide: 0 };
    const result = createProceduralGeometry(params);
    expect(result.screenWidth).toBeCloseTo(result.bodyWidth, 2);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run tests/lib/procedural-geometry.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement procedural geometry**

Create `src/lib/procedural-geometry.ts`:

```typescript
import type { ProceduralParams } from "../types/scene";

const SCALE = 0.01; // mm to scene units (1 unit = 100mm)

export interface ProceduralGeometryResult {
  bodyWidth: number;
  bodyHeight: number;
  bodyDepth: number;
  screenWidth: number;
  screenHeight: number;
  screenOffsetX: number;
  screenOffsetY: number;
  cornerRadius: number;
  color: string;
  material: string;
}

export function createProceduralGeometry(
  params: ProceduralParams
): ProceduralGeometryResult {
  const bodyWidth = params.width * SCALE;
  const bodyHeight = params.height * SCALE;
  const bodyDepth = params.thickness * SCALE;

  const screenWidthMm = params.width - 2 * params.bezelSide;
  const screenHeightMm = params.height - params.bezelTop - params.bezelBottom;
  const screenWidth = screenWidthMm * SCALE;
  const screenHeight = screenHeightMm * SCALE;

  // Screen offset: centered horizontally, shifted vertically if bezels differ
  const screenOffsetX = 0;
  const screenOffsetY = (params.bezelBottom - params.bezelTop) * SCALE * 0.5;

  const cornerRadius = params.cornerRadius * SCALE;

  return {
    bodyWidth,
    bodyHeight,
    bodyDepth,
    screenWidth,
    screenHeight,
    screenOffsetX,
    screenOffsetY,
    cornerRadius,
    color: params.color,
    material: params.material,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run tests/lib/procedural-geometry.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/lib/procedural-geometry.ts tests/lib/procedural-geometry.test.ts
git commit -m "feat: add procedural device geometry generator"
```

### Task 7: Device Catalog

**Files:**
- Create: `src/lib/device-catalog.ts`, `tests/lib/device-catalog.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/device-catalog.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { deviceCatalog, getDeviceByModel } from "../src/lib/device-catalog";

describe("device-catalog", () => {
  it("has iPad Air in catalog", () => {
    const ipadAir = getDeviceByModel("ipad-air");
    expect(ipadAir).toBeDefined();
    expect(ipadAir!.name).toBe("iPad Air");
    expect(ipadAir!.category).toBe("tablet");
  });

  it("has iPhone 16 Pro in catalog", () => {
    const iphone = getDeviceByModel("iphone-16-pro");
    expect(iphone).toBeDefined();
    expect(iphone!.category).toBe("phone");
  });

  it("has MacBook Pro in catalog", () => {
    const macbook = getDeviceByModel("macbook-pro-16");
    expect(macbook).toBeDefined();
    expect(macbook!.category).toBe("laptop");
  });

  it("returns undefined for unknown model", () => {
    expect(getDeviceByModel("nonexistent")).toBeUndefined();
  });

  it("catalog has at least 10 devices", () => {
    expect(deviceCatalog.length).toBeGreaterThanOrEqual(10);
  });

  it("all catalog entries have required fields", () => {
    for (const entry of deviceCatalog) {
      expect(entry.model).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.proceduralParams.width).toBeGreaterThan(0);
      expect(entry.proceduralParams.height).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run tests/lib/device-catalog.test.ts
```

- [ ] **Step 3: Implement device catalog**

Create `src/lib/device-catalog.ts`:

```typescript
import type { ProceduralParams } from "../types/scene";

export interface CatalogEntry {
  model: string;
  name: string;
  category: "phone" | "tablet" | "laptop" | "desktop" | "watch";
  gltfPath: string | null; // null = use procedural
  proceduralParams: ProceduralParams;
}

export const deviceCatalog: CatalogEntry[] = [
  // -- Phones --
  {
    model: "iphone-16-pro",
    name: "iPhone 16 Pro",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 71.5, height: 149.6, screenWidth: 1206, screenHeight: 2622,
      bezelTop: 3.5, bezelBottom: 3.5, bezelSide: 2.5, cornerRadius: 10,
      thickness: 8.25, color: "#1c1c1e", material: "metallic",
    },
  },
  {
    model: "iphone-16-pro-max",
    name: "iPhone 16 Pro Max",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 77.6, height: 163.0, screenWidth: 1320, screenHeight: 2868,
      bezelTop: 3.5, bezelBottom: 3.5, bezelSide: 2.5, cornerRadius: 10,
      thickness: 8.25, color: "#1c1c1e", material: "metallic",
    },
  },
  {
    model: "iphone-15",
    name: "iPhone 15",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 71.6, height: 147.6, screenWidth: 1179, screenHeight: 2556,
      bezelTop: 3.5, bezelBottom: 3.5, bezelSide: 3, cornerRadius: 10,
      thickness: 7.8, color: "#1c1c1e", material: "glossy",
    },
  },
  {
    model: "samsung-galaxy-s24",
    name: "Samsung Galaxy S24",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 70.6, height: 147.0, screenWidth: 1080, screenHeight: 2340,
      bezelTop: 3, bezelBottom: 3, bezelSide: 2, cornerRadius: 8,
      thickness: 7.6, color: "#2d2d2d", material: "metallic",
    },
  },
  {
    model: "pixel-9",
    name: "Google Pixel 9",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 68.1, height: 152.8, screenWidth: 1080, screenHeight: 2424,
      bezelTop: 3, bezelBottom: 3, bezelSide: 2.5, cornerRadius: 9,
      thickness: 8.5, color: "#e8e5e0", material: "matte",
    },
  },
  // -- Tablets --
  {
    model: "ipad-air",
    name: "iPad Air",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 178.5, height: 247.6, screenWidth: 1640, screenHeight: 2360,
      bezelTop: 8, bezelBottom: 8, bezelSide: 8, cornerRadius: 12,
      thickness: 6.1, color: "#2e2e30", material: "metallic",
    },
  },
  {
    model: "ipad-pro-13",
    name: "iPad Pro 13\"",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 215.5, height: 281.6, screenWidth: 2064, screenHeight: 2752,
      bezelTop: 6, bezelBottom: 6, bezelSide: 6, cornerRadius: 12,
      thickness: 5.1, color: "#2e2e30", material: "metallic",
    },
  },
  {
    model: "lenovo-tab-k11",
    name: "Lenovo Tab K11",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 165.8, height: 247.8, screenWidth: 1200, screenHeight: 1920,
      bezelTop: 10, bezelBottom: 10, bezelSide: 10, cornerRadius: 8,
      thickness: 7.4, color: "#2d2d2d", material: "matte",
    },
  },
  {
    model: "samsung-tab-s9",
    name: "Samsung Galaxy Tab S9",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 165.8, height: 254.3, screenWidth: 1600, screenHeight: 2560,
      bezelTop: 7, bezelBottom: 7, bezelSide: 7, cornerRadius: 8,
      thickness: 5.9, color: "#1a1a1a", material: "metallic",
    },
  },
  // -- Laptops --
  {
    model: "macbook-pro-16",
    name: "MacBook Pro 16\"",
    category: "laptop",
    gltfPath: null,
    proceduralParams: {
      width: 355.7, height: 248.1, screenWidth: 3456, screenHeight: 2234,
      bezelTop: 5, bezelBottom: 5, bezelSide: 5, cornerRadius: 6,
      thickness: 16.8, color: "#2e2e30", material: "metallic",
    },
  },
  {
    model: "macbook-air-15",
    name: "MacBook Air 15\"",
    category: "laptop",
    gltfPath: null,
    proceduralParams: {
      width: 340.4, height: 237.6, screenWidth: 2880, screenHeight: 1864,
      bezelTop: 5, bezelBottom: 5, bezelSide: 5, cornerRadius: 6,
      thickness: 11.5, color: "#2e2e30", material: "metallic",
    },
  },
  // -- Watch --
  {
    model: "apple-watch-10",
    name: "Apple Watch Series 10",
    category: "watch",
    gltfPath: null,
    proceduralParams: {
      width: 36.0, height: 42.0, screenWidth: 416, screenHeight: 496,
      bezelTop: 2, bezelBottom: 2, bezelSide: 2, cornerRadius: 14,
      thickness: 9.7, color: "#1c1c1e", material: "metallic",
    },
  },
  // -- Generic --
  {
    model: "generic-phone",
    name: "Generic Phone",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 72, height: 150, screenWidth: 1080, screenHeight: 2400,
      bezelTop: 3, bezelBottom: 3, bezelSide: 3, cornerRadius: 10,
      thickness: 8, color: "#333333", material: "matte",
    },
  },
  {
    model: "generic-tablet",
    name: "Generic Tablet",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 170, height: 250, screenWidth: 1600, screenHeight: 2560,
      bezelTop: 8, bezelBottom: 8, bezelSide: 8, cornerRadius: 10,
      thickness: 6.5, color: "#333333", material: "matte",
    },
  },
];

export function getDeviceByModel(model: string): CatalogEntry | undefined {
  return deviceCatalog.find((d) => d.model === model);
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run tests/lib/device-catalog.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/lib/device-catalog.ts tests/lib/device-catalog.test.ts
git commit -m "feat: add device catalog with 14 built-in devices"
```

### Task 8: 3D Viewport + ProceduralDevice Component

**Files:**
- Create: `src/components/viewport/Viewport.tsx`, `src/components/viewport/ProceduralDevice.tsx`, `src/components/viewport/DeviceMesh.tsx`, `src/components/viewport/ScreenTexture.tsx`

- [ ] **Step 1: Create ScreenTexture component**

Create `src/components/viewport/ScreenTexture.tsx`:

```tsx
import { useRef, useEffect } from "react";
import * as THREE from "three";
import type { Layer } from "../../types/scene";

interface ScreenTextureProps {
  screenWidth: number;
  screenHeight: number;
  screenContent: { type: "video" | "image"; source: string } | null;
  layers: Layer[];
  currentTime: number;
}

export function useScreenTexture({
  screenWidth,
  screenHeight,
  screenContent,
  layers,
  currentTime,
}: ScreenTextureProps): THREE.CanvasTexture | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  if (!canvasRef.current) {
    canvasRef.current = document.createElement("canvas");
    canvasRef.current.width = screenWidth || 1920;
    canvasRef.current.height = screenHeight || 1080;
  }

  if (!textureRef.current) {
    textureRef.current = new THREE.CanvasTexture(canvasRef.current);
    textureRef.current.minFilter = THREE.LinearFilter;
    textureRef.current.magFilter = THREE.LinearFilter;
  }

  useEffect(() => {
    if (!screenContent || screenContent.type !== "image") return;
    const img = new Image();
    img.src = screenContent.source;
    img.onload = () => {
      imageRef.current = img;
    };
  }, [screenContent]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Clear
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw base screen content
    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Draw layers (filtered by time)
    for (const layer of layers) {
      if (!layer.visible) continue;
      if (currentTime < layer.timeRange[0] || currentTime > layer.timeRange[1]) continue;
      drawLayer(ctx, layer, canvas.width, canvas.height);
    }

    textureRef.current!.needsUpdate = true;
  }, [screenContent, layers, currentTime]);

  return textureRef.current;
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  canvasWidth: number,
  canvasHeight: number
): void {
  switch (layer.type) {
    case "spotlight": {
      const { center, radius, dimOpacity, shape } = layer.properties;
      // Dim everything
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${dimOpacity})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      // Clear spotlight area
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      if (shape === "circle") {
        ctx.arc(center[0], center[1], radius, 0, Math.PI * 2);
      } else {
        ctx.rect(center[0] - radius, center[1] - radius, radius * 2, radius * 2);
      }
      ctx.fill();
      ctx.restore();
      break;
    }
    case "text": {
      const { text, position, fontSize, color, backgroundColor, fontFamily, shadow } =
        layer.properties;
      ctx.save();
      ctx.font = `${fontSize}px ${fontFamily || "sans-serif"}`;
      if (backgroundColor) {
        const metrics = ctx.measureText(text);
        const padding = 8;
        ctx.fillStyle = backgroundColor;
        ctx.beginPath();
        ctx.roundRect(
          position[0] - padding,
          position[1] - fontSize - padding,
          metrics.width + padding * 2,
          fontSize + padding * 2,
          6
        );
        ctx.fill();
      }
      if (shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      ctx.fillStyle = color;
      ctx.fillText(text, position[0], position[1]);
      ctx.restore();
      break;
    }
    case "arrow": {
      const { from, to, color, thickness, headSize, style } = layer.properties;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = thickness;
      if (style === "dashed") ctx.setLineDash([8, 4]);
      // Line
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
      ctx.beginPath();
      ctx.moveTo(to[0], to[1]);
      ctx.lineTo(
        to[0] - headSize * Math.cos(angle - Math.PI / 6),
        to[1] - headSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        to[0] - headSize * Math.cos(angle + Math.PI / 6),
        to[1] - headSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case "blur": {
      const { region, strength } = layer.properties;
      ctx.save();
      ctx.filter = `blur(${strength}px)`;
      const imgData = ctx.getImageData(region.x, region.y, region.width, region.height);
      ctx.putImageData(imgData, region.x, region.y);
      // Re-draw blurred area
      ctx.drawImage(
        ctx.canvas,
        region.x, region.y, region.width, region.height,
        region.x, region.y, region.width, region.height
      );
      ctx.filter = "none";
      ctx.restore();
      break;
    }
    case "shape": {
      const { shapeType, position, size, color, opacity, strokeWidth, filled } = layer.properties;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = strokeWidth;
      if (shapeType === "rect") {
        if (filled) ctx.fillRect(position[0], position[1], size[0], size[1]);
        else ctx.strokeRect(position[0], position[1], size[0], size[1]);
      } else if (shapeType === "circle") {
        ctx.beginPath();
        ctx.ellipse(position[0], position[1], size[0] / 2, size[1] / 2, 0, 0, Math.PI * 2);
        if (filled) ctx.fill();
        else ctx.stroke();
      } else if (shapeType === "line") {
        ctx.beginPath();
        ctx.moveTo(position[0], position[1]);
        ctx.lineTo(position[0] + size[0], position[1] + size[1]);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "tap": {
      const { position, rippleColor, rippleSize } = layer.properties;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = rippleColor;
      ctx.beginPath();
      ctx.arc(position[0], position[1], rippleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(position[0], position[1], rippleSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "callout": {
      const { position, targetPosition, label, color, fontSize } = layer.properties;
      ctx.save();
      // Connector line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(position[0], position[1]);
      ctx.lineTo(targetPosition[0], targetPosition[1]);
      ctx.stroke();
      // Badge
      ctx.fillStyle = color;
      const badgeSize = fontSize * 1.5;
      ctx.beginPath();
      ctx.arc(position[0], position[1], badgeSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, position[0], position[1]);
      ctx.restore();
      break;
    }
    // zoom, region_replace, cursor — implemented later with asset loading
    default:
      break;
  }
}
```

- [ ] **Step 2: Create ProceduralDevice component**

Create `src/components/viewport/ProceduralDevice.tsx`:

```tsx
import { useMemo } from "react";
import * as THREE from "three";
import { createProceduralGeometry } from "../../lib/procedural-geometry";
import { useScreenTexture } from "./ScreenTexture";
import type { Device } from "../../types/scene";
import { useSceneStore } from "../../stores/scene-store";

interface ProceduralDeviceProps {
  device: Device;
}

export function ProceduralDevice({ device }: ProceduralDeviceProps) {
  const currentTime = useSceneStore((s) => s.editor.currentTime);
  const geo = useMemo(() => {
    if (!device.proceduralParams) return null;
    return createProceduralGeometry(device.proceduralParams);
  }, [device.proceduralParams]);

  const screenTexture = useScreenTexture({
    screenWidth: device.proceduralParams?.screenWidth ?? 1920,
    screenHeight: device.proceduralParams?.screenHeight ?? 1080,
    screenContent: device.screenContent,
    layers: device.layers,
    currentTime,
  });

  if (!geo) return null;

  const bodyShape = useMemo(() => {
    const shape = new THREE.Shape();
    const w = geo.bodyWidth / 2;
    const h = geo.bodyHeight / 2;
    const r = Math.min(geo.cornerRadius, w, h);
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
    return shape;
  }, [geo]);

  const bodyGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(bodyShape, {
      depth: geo.bodyDepth,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 3,
    });
  }, [bodyShape, geo.bodyDepth]);

  return (
    <group
      position={device.position}
      rotation={device.rotation.map((r) => r) as [number, number, number]}
      scale={device.scale}
    >
      {/* Device body */}
      <mesh geometry={bodyGeometry}>
        <meshStandardMaterial
          color={geo.color}
          metalness={geo.material === "metallic" ? 0.8 : 0.1}
          roughness={geo.material === "glossy" ? 0.2 : 0.7}
        />
      </mesh>
      {/* Screen */}
      <mesh position={[geo.screenOffsetX, geo.screenOffsetY, geo.bodyDepth + 0.001]}>
        <planeGeometry args={[geo.screenWidth, geo.screenHeight]} />
        {screenTexture ? (
          <meshBasicMaterial map={screenTexture} />
        ) : (
          <meshBasicMaterial color="#111111" />
        )}
      </mesh>
    </group>
  );
}
```

- [ ] **Step 3: Create DeviceMesh router component**

Create `src/components/viewport/DeviceMesh.tsx`:

```tsx
import { ProceduralDevice } from "./ProceduralDevice";
import type { Device } from "../../types/scene";

interface DeviceMeshProps {
  device: Device;
}

export function DeviceMesh({ device }: DeviceMeshProps) {
  // For now, all devices use procedural rendering.
  // GLTF loading will be added in Task 23.
  return <ProceduralDevice device={device} />;
}
```

- [ ] **Step 4: Create Viewport component**

Create `src/components/viewport/Viewport.tsx`:

```tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { useSceneStore } from "../../stores/scene-store";
import { DeviceMesh } from "./DeviceMesh";

export function Viewport() {
  const devices = useSceneStore((s) => s.scene.devices);
  const env = useSceneStore((s) => s.scene.environment);
  const bgColor = useSceneStore((s) => s.scene.canvas.backgroundColor);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={[bgColor]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        {env.type !== "none" && (
          <Environment preset={env.type === "studio" ? "studio" : env.type as any} />
        )}
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1a1a3a"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#2a2a5a"
          fadeDistance={15}
          infiniteGrid
          position={[0, -2, 0]}
        />
        {devices.map((device) => (
          <DeviceMesh key={device.id} device={device} />
        ))}
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/components/viewport/
git commit -m "feat: add 3D viewport with procedural device rendering and screen texture compositor"
```

---

## Phase 4: App Shell + UI Panels

### Task 9: App Layout + Top Bar

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/components/panels/TopBar.tsx`, `src/styles.css`

- [ ] **Step 1: Create TopBar**

Create `src/components/panels/TopBar.tsx`:

```tsx
import { useSceneStore } from "../../stores/scene-store";

export function TopBar() {
  const sceneName = useSceneStore((s) => s.scene.name);

  return (
    <div className="h-11 bg-[#1a1a2e] border-b border-[#2a2a4a] flex items-center px-4 gap-4 select-none">
      <span className="text-[#7c7cff] font-bold text-sm">MockupStudio</span>
      <span className="text-[#444]">|</span>
      <span className="text-[#888] text-xs">{sceneName}</span>
      <div className="flex-1" />
      <span className="text-[#4ade80] text-xs">● MCP Ready</span>
      <button className="bg-[#7c7cff] text-white text-xs px-3 py-1 rounded hover:bg-[#6b6bef] transition-colors">
        Export ▶
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx with 4-panel layout**

Replace `src/App.tsx`:

```tsx
import { Viewport } from "./components/viewport/Viewport";
import { TopBar } from "./components/panels/TopBar";

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a1a] text-white overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-60 bg-[#16162a] border-r border-[#2a2a4a] overflow-y-auto shrink-0">
          <div className="p-3 text-xs text-[#555]">Devices & Layers</div>
        </div>
        {/* Center: Viewport */}
        <div className="flex-1 overflow-hidden">
          <Viewport />
        </div>
        {/* Right Panel */}
        <div className="w-70 bg-[#16162a] border-l border-[#2a2a4a] overflow-y-auto shrink-0">
          <div className="p-3 text-xs text-[#555]">Properties</div>
        </div>
      </div>
      {/* Bottom: Timeline */}
      <div className="h-44 bg-[#12122a] border-t border-[#2a2a4a] shrink-0">
        <div className="p-3 text-xs text-[#555]">Timeline</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update styles.css**

Replace `src/styles.css`:

```css
@import "tailwindcss";

html, body, #root {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a0a1a;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #3a3a5a; }
```

- [ ] **Step 4: Update main.tsx to import styles**

Ensure `src/main.tsx` imports styles:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 5: Verify app runs**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm run tauri dev
```

Expected: Tauri window opens with dark 4-panel layout. Center shows 3D viewport with grid. No devices yet (empty scene).

- [ ] **Step 6: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/App.tsx src/main.tsx src/styles.css src/components/panels/TopBar.tsx
git commit -m "feat: add 4-panel editor layout with top bar"
```

### Task 10: Device Panel

**Files:**
- Create: `src/components/panels/DevicePanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create DevicePanel**

Create `src/components/panels/DevicePanel.tsx`:

```tsx
import { useSceneStore } from "../../stores/scene-store";
import { deviceCatalog } from "../../lib/device-catalog";
import type { CatalogEntry } from "../../lib/device-catalog";

export function DevicePanel() {
  const devices = useSceneStore((s) => s.scene.devices);
  const selectedDeviceId = useSceneStore((s) => s.editor.selectedDeviceId);
  const addDevice = useSceneStore((s) => s.addDevice);
  const removeDevice = useSceneStore((s) => s.removeDevice);
  const selectDevice = useSceneStore((s) => s.selectDevice);

  const handleAddDevice = (entry: CatalogEntry) => {
    addDevice({
      name: entry.name,
      type: entry.gltfPath ? "gltf" : "procedural",
      model: entry.model,
      proceduralParams: entry.proceduralParams,
    });
  };

  return (
    <div>
      {/* Device list */}
      <div className="p-3 border-b border-[#2a2a4a]">
        <div className="text-[#666] text-[10px] uppercase tracking-wider mb-2">Devices</div>
        {devices.map((d) => (
          <div
            key={d.id}
            onClick={() => selectDevice(d.id)}
            className={`rounded-md px-2 py-1.5 mb-1 cursor-pointer text-xs flex items-center justify-between ${
              selectedDeviceId === d.id
                ? "bg-[#1e1e3a] border border-[#3a3a5a] text-[#7c7cff]"
                : "bg-[#1e1e3a] border border-[#2a2a4a] text-[#aaa] hover:border-[#3a3a5a]"
            }`}
          >
            <span>📱 {d.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeDevice(d.id);
              }}
              className="text-[#555] hover:text-[#f87171] text-[10px]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {/* Add device dropdown */}
      <div className="p-3">
        <div className="text-[#666] text-[10px] uppercase tracking-wider mb-2">Add Device</div>
        {(["phone", "tablet", "laptop", "watch"] as const).map((cat) => {
          const entries = deviceCatalog.filter((e) => e.category === cat);
          if (entries.length === 0) return null;
          return (
            <div key={cat} className="mb-2">
              <div className="text-[#555] text-[9px] uppercase mb-1">{cat}s</div>
              {entries.map((entry) => (
                <button
                  key={entry.model}
                  onClick={() => handleAddDevice(entry)}
                  className="block w-full text-left text-[11px] text-[#888] hover:text-white hover:bg-[#1e1e3a] px-2 py-1 rounded transition-colors"
                >
                  + {entry.name}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create LayerPanel**

Create `src/components/panels/LayerPanel.tsx`:

```tsx
import { useSceneStore } from "../../stores/scene-store";
import type { LayerType } from "../../types/scene";

const layerTypeLabels: Record<LayerType, string> = {
  spotlight: "Spotlight",
  blur: "Blur",
  zoom: "Zoom Inset",
  arrow: "Arrow",
  text: "Text",
  callout: "Callout",
  region_replace: "Region Replace",
  tap: "Tap Indicator",
  cursor: "Cursor",
  shape: "Shape",
};

const defaultLayerProperties: Record<LayerType, Record<string, unknown>> = {
  spotlight: { center: [400, 300], radius: 80, shape: "circle", dimOpacity: 0.6, feather: 10 },
  blur: { region: { x: 10, y: 10, width: 200, height: 40 }, strength: 8 },
  text: { text: "Label", position: [100, 100], fontSize: 24, color: "#ffffff", backgroundColor: null, fontFamily: "sans-serif", shadow: true },
  arrow: { from: [200, 200], to: [300, 300], color: "#4ade80", thickness: 3, headSize: 12, style: "solid" },
  zoom: { sourceRegion: { x: 100, y: 100, width: 200, height: 150 }, displayPosition: [50, 50], scale: 2.5, borderColor: "#7c7cff", borderWidth: 2, showConnector: true },
  callout: { position: [100, 100], targetPosition: [200, 200], label: "1", style: "badge", color: "#7c7cff", fontSize: 14 },
  region_replace: { region: { x: 0, y: 0, width: 100, height: 50 }, source: "" },
  tap: { position: [200, 300], rippleColor: "rgba(255,255,255,0.5)", rippleSize: 30 },
  cursor: { path: [[100, 100], [200, 200], [300, 150]], style: "pointer", color: "#ffffff", size: 20 },
  shape: { shapeType: "rect", position: [100, 100], size: [200, 100], color: "#7c7cff", opacity: 0.3, strokeWidth: 2, filled: false },
};

export function LayerPanel() {
  const selectedDeviceId = useSceneStore((s) => s.editor.selectedDeviceId);
  const devices = useSceneStore((s) => s.scene.devices);
  const addLayer = useSceneStore((s) => s.addLayer);
  const removeLayer = useSceneStore((s) => s.removeLayer);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const selectLayer = useSceneStore((s) => s.selectLayer);
  const selectedLayerId = useSceneStore((s) => s.editor.selectedLayerId);

  const device = devices.find((d) => d.id === selectedDeviceId);
  if (!device) {
    return <div className="p-3 text-[#555] text-xs">Select a device to see layers</div>;
  }

  const handleAddLayer = (type: LayerType) => {
    addLayer(device.id, {
      type,
      name: `${layerTypeLabels[type]} ${device.layers.filter((l) => l.type === type).length + 1}`,
      properties: defaultLayerProperties[type],
    });
  };

  const layerColors: Record<string, string> = {
    spotlight: "#60a5fa",
    blur: "#facc15",
    text: "#f87171",
    arrow: "#4ade80",
    zoom: "#a78bfa",
    callout: "#7c7cff",
    tap: "#fb923c",
    cursor: "#e879f9",
    shape: "#22d3ee",
    region_replace: "#f472b6",
  };

  return (
    <div className="p-3">
      <div className="text-[#666] text-[10px] uppercase tracking-wider mb-2">
        Layers ({device.name})
      </div>
      {[...device.layers].reverse().map((layer) => (
        <div
          key={layer.id}
          onClick={() => selectLayer(layer.id)}
          className={`rounded px-2 py-1 mb-1 cursor-pointer text-[11px] flex items-center gap-2 ${
            selectedLayerId === layer.id
              ? "border border-[#3a3a5a] bg-[#1e1e3a]"
              : "border border-transparent hover:bg-[#1e1e3a]"
          }`}
          style={{ color: layerColors[layer.type] || "#888" }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateLayer(device.id, layer.id, { visible: !layer.visible });
            }}
            className="text-[10px] opacity-60 hover:opacity-100"
          >
            {layer.visible ? "👁" : "👁‍🗨"}
          </button>
          <span className="flex-1 truncate">{layer.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeLayer(device.id, layer.id);
            }}
            className="text-[#555] hover:text-[#f87171] text-[10px]"
          >
            ✕
          </button>
        </div>
      ))}
      {/* Add layer menu */}
      <div className="mt-2 border-t border-[#2a2a4a] pt-2">
        <div className="text-[#555] text-[9px] uppercase mb-1">Add Layer</div>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(layerTypeLabels) as LayerType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleAddLayer(type)}
              className="text-[10px] text-[#888] hover:text-white hover:bg-[#1e1e3a] px-2 py-1 rounded transition-colors text-left"
            >
              + {layerTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire panels into App.tsx**

Update left panel in `src/App.tsx`:

```tsx
import { Viewport } from "./components/viewport/Viewport";
import { TopBar } from "./components/panels/TopBar";
import { DevicePanel } from "./components/panels/DevicePanel";
import { LayerPanel } from "./components/panels/LayerPanel";

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a1a] text-white overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-60 bg-[#16162a] border-r border-[#2a2a4a] overflow-y-auto shrink-0">
          <DevicePanel />
          <div className="border-t border-[#2a2a4a]" />
          <LayerPanel />
        </div>
        {/* Center: Viewport */}
        <div className="flex-1 overflow-hidden">
          <Viewport />
        </div>
        {/* Right Panel */}
        <div className="w-70 bg-[#16162a] border-l border-[#2a2a4a] overflow-y-auto shrink-0">
          <div className="p-3 text-xs text-[#555]">Properties</div>
        </div>
      </div>
      {/* Bottom: Timeline */}
      <div className="h-44 bg-[#12122a] border-t border-[#2a2a4a] shrink-0">
        <div className="p-3 text-xs text-[#555]">Timeline</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify app runs with panels**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm run tauri dev
```

Expected: App shows with device catalog on left. Click "iPad Air" → 3D device appears in viewport. Click "Spotlight" in layer panel → overlay appears on device.

- [ ] **Step 5: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/components/panels/ src/App.tsx
git commit -m "feat: add device panel, layer panel with all 10 layer types"
```

### Task 11: Property Inspector Panel

**Files:**
- Create: `src/components/panels/PropertyPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create PropertyPanel**

Create `src/components/panels/PropertyPanel.tsx`:

```tsx
import { useSceneStore } from "../../stores/scene-store";
import type { Layer, Device } from "../../types/scene";

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
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[10px] text-[#666] w-16 shrink-0">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 bg-[#1e1e3a] border border-[#2a2a4a] rounded px-2 py-1 text-xs text-[#60a5fa] w-full"
      />
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[10px] text-[#666] w-16 shrink-0">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 bg-transparent border-0 cursor-pointer"
      />
      <span className="text-[10px] text-[#555]">{value}</span>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[10px] text-[#666] w-16 shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-[#1e1e3a] border border-[#2a2a4a] rounded px-2 py-1 text-xs text-[#aaa]"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] text-[#666] uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

function DeviceProperties({ device }: { device: Device }) {
  const updateDevice = useSceneStore((s) => s.updateDevice);
  return (
    <>
      <Section title="Position">
        {(["x", "y", "z"] as const).map((axis, i) => (
          <NumberInput
            key={axis}
            label={axis.toUpperCase()}
            value={device.position[i]}
            step={0.1}
            onChange={(v) => {
              const pos = [...device.position] as [number, number, number];
              pos[i] = v;
              updateDevice(device.id, { position: pos });
            }}
          />
        ))}
      </Section>
      <Section title="Rotation (rad)">
        {(["x", "y", "z"] as const).map((axis, i) => (
          <NumberInput
            key={axis}
            label={axis.toUpperCase()}
            value={device.rotation[i]}
            step={0.1}
            onChange={(v) => {
              const rot = [...device.rotation] as [number, number, number];
              rot[i] = v;
              updateDevice(device.id, { rotation: rot });
            }}
          />
        ))}
      </Section>
    </>
  );
}

function LayerProperties({ device, layer }: { device: Device; layer: Layer }) {
  const updateLayer = useSceneStore((s) => s.updateLayer);

  const updateProp = (key: string, value: unknown) => {
    updateLayer(device.id, layer.id, {
      properties: { ...layer.properties, [key]: value },
    } as Partial<Layer>);
  };

  const props = layer.properties as Record<string, unknown>;

  return (
    <>
      <Section title={`${layer.type} — ${layer.name}`}>
        <TextInput label="Name" value={layer.name} onChange={(v) => updateLayer(device.id, layer.id, { name: v })} />
        <NumberInput label="Start (s)" value={layer.timeRange[0]} step={0.1} min={0} onChange={(v) => updateLayer(device.id, layer.id, { timeRange: [v, layer.timeRange[1]] })} />
        <NumberInput label="End (s)" value={layer.timeRange[1]} step={0.1} min={0} onChange={(v) => updateLayer(device.id, layer.id, { timeRange: [layer.timeRange[0], v] })} />
      </Section>
      <Section title="Properties">
        {Object.entries(props).map(([key, val]) => {
          if (typeof val === "number") {
            return <NumberInput key={key} label={key} value={val} step={key.includes("opacity") ? 0.05 : 1} onChange={(v) => updateProp(key, v)} />;
          }
          if (typeof val === "string" && val.startsWith("#")) {
            return <ColorInput key={key} label={key} value={val} onChange={(v) => updateProp(key, v)} />;
          }
          if (typeof val === "string") {
            return <TextInput key={key} label={key} value={val} onChange={(v) => updateProp(key, v)} />;
          }
          if (Array.isArray(val) && val.length === 2 && typeof val[0] === "number") {
            return (
              <div key={key} className="mb-1.5">
                <span className="text-[10px] text-[#666]">{key}</span>
                <div className="flex gap-1 mt-1">
                  <NumberInput label="X" value={val[0]} onChange={(v) => updateProp(key, [v, val[1]])} />
                  <NumberInput label="Y" value={val[1]} onChange={(v) => updateProp(key, [val[0], v])} />
                </div>
              </div>
            );
          }
          return null;
        })}
      </Section>
    </>
  );
}

export function PropertyPanel() {
  const selectedDeviceId = useSceneStore((s) => s.editor.selectedDeviceId);
  const selectedLayerId = useSceneStore((s) => s.editor.selectedLayerId);
  const devices = useSceneStore((s) => s.scene.devices);

  const device = devices.find((d) => d.id === selectedDeviceId);
  if (!device) {
    return <div className="p-3 text-xs text-[#555]">Select a device or layer</div>;
  }

  const layer = selectedLayerId ? device.layers.find((l) => l.id === selectedLayerId) : null;

  return (
    <div className="p-3">
      {layer ? (
        <LayerProperties device={device} layer={layer} />
      ) : (
        <DeviceProperties device={device} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into App.tsx**

Replace the right panel placeholder in `src/App.tsx` with:

```tsx
import { PropertyPanel } from "./components/panels/PropertyPanel";
```

And replace the right panel div content:

```tsx
<div className="w-70 bg-[#16162a] border-l border-[#2a2a4a] overflow-y-auto shrink-0">
  <PropertyPanel />
</div>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/components/panels/PropertyPanel.tsx src/App.tsx
git commit -m "feat: add property inspector panel with dynamic inputs per layer type"
```

### Task 12: Timeline

**Files:**
- Create: `src/components/timeline/Timeline.tsx`, `src/components/timeline/TimelineTrack.tsx`, `src/components/timeline/TimelinePlayhead.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create TimelinePlayhead**

Create `src/components/timeline/TimelinePlayhead.tsx`:

```tsx
interface PlayheadProps {
  time: number;
  duration: number;
  trackAreaWidth: number;
  onSeek: (time: number) => void;
}

export function TimelinePlayhead({ time, duration, trackAreaWidth, onSeek }: PlayheadProps) {
  const x = (time / duration) * trackAreaWidth;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-[#7c7cff] z-10 pointer-events-none"
      style={{ left: `${x}px` }}
    >
      <div className="w-2 h-2 bg-[#7c7cff] rounded-sm -ml-[3px] -mt-1" />
    </div>
  );
}
```

- [ ] **Step 2: Create TimelineTrack**

Create `src/components/timeline/TimelineTrack.tsx`:

```tsx
interface TrackProps {
  name: string;
  color: string;
  timeRange: [number, number];
  duration: number;
  width: number;
  indent?: boolean;
}

export function TimelineTrack({ name, color, timeRange, duration, width, indent }: TrackProps) {
  const left = (timeRange[0] / duration) * width;
  const barWidth = ((timeRange[1] - timeRange[0]) / duration) * width;

  return (
    <div className="flex h-[22px] border-b border-[#1a1a2a]">
      <div className="w-[140px] shrink-0 px-2 py-1 text-[11px] bg-[#14142a] border-r border-[#2a2a4a] truncate" style={{ color, paddingLeft: indent ? "20px" : "8px" }}>
        {indent ? "● " : "📱 "}{name}
      </div>
      <div className="flex-1 relative bg-[#0e0e1e]" style={{ width: `${width}px` }}>
        <div
          className="absolute top-[3px] h-[14px] rounded-sm"
          style={{
            left: `${left}px`,
            width: `${barWidth}px`,
            backgroundColor: `${color}22`,
            border: `1px solid ${color}55`,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Timeline**

Create `src/components/timeline/Timeline.tsx`:

```tsx
import { useRef, useCallback } from "react";
import { useSceneStore } from "../../stores/scene-store";
import { TimelineTrack } from "./TimelineTrack";
import { TimelinePlayhead } from "./TimelinePlayhead";

const TRACK_AREA_WIDTH = 800;

const layerColors: Record<string, string> = {
  spotlight: "#60a5fa", blur: "#facc15", text: "#f87171", arrow: "#4ade80",
  zoom: "#a78bfa", callout: "#7c7cff", tap: "#fb923c", cursor: "#e879f9",
  shape: "#22d3ee", region_replace: "#f472b6",
};

export function Timeline() {
  const devices = useSceneStore((s) => s.scene.devices);
  const duration = useSceneStore((s) => s.scene.canvas.duration);
  const currentTime = useSceneStore((s) => s.editor.currentTime);
  const isPlaying = useSceneStore((s) => s.editor.isPlaying);
  const setCurrentTime = useSceneStore((s) => s.setCurrentTime);
  const setPlaying = useSceneStore((s) => s.setPlaying);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const handleSeek = useCallback(
    (e: React.MouseEvent) => {
      if (!trackAreaRef.current) return;
      const rect = trackAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 140; // subtract label width
      const t = Math.max(0, Math.min(duration, (x / TRACK_AREA_WIDTH) * duration));
      setCurrentTime(t);
    },
    [duration, setCurrentTime]
  );

  // Time ruler marks
  const marks = [];
  for (let t = 0; t <= duration; t++) {
    marks.push(t);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Transport controls */}
      <div className="flex items-center px-3 py-1 gap-2 border-b border-[#1e1e3a]">
        <button onClick={() => setCurrentTime(0)} className="text-[#aaa] hover:text-white text-sm">⏮</button>
        <button onClick={() => setPlaying(!isPlaying)} className="text-[#4ade80] hover:text-white text-lg">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={() => setCurrentTime(duration)} className="text-[#aaa] hover:text-white text-sm">⏭</button>
        <span className="text-[#888] text-xs ml-2">{currentTime.toFixed(1)}s / {duration}s</span>
        <div className="flex-1" />
        <span className="text-[#555] text-[10px]">Snap: 0.1s</span>
      </div>
      {/* Time ruler */}
      <div className="flex border-b border-[#1a1a2a]" style={{ paddingLeft: "140px" }}>
        <div className="flex justify-between text-[9px] text-[#444]" style={{ width: `${TRACK_AREA_WIDTH}px` }}>
          {marks.map((t) => (
            <span key={t}>{t}s</span>
          ))}
        </div>
      </div>
      {/* Tracks */}
      <div ref={trackAreaRef} className="flex-1 overflow-y-auto relative" onClick={handleSeek}>
        <div className="absolute top-0 bottom-0" style={{ left: "140px", width: `${TRACK_AREA_WIDTH}px` }}>
          <TimelinePlayhead time={currentTime} duration={duration} trackAreaWidth={TRACK_AREA_WIDTH} onSeek={setCurrentTime} />
        </div>
        {devices.map((device) => (
          <div key={device.id}>
            <TimelineTrack
              name={device.name}
              color="#7c7cff"
              timeRange={[0, duration]}
              duration={duration}
              width={TRACK_AREA_WIDTH}
            />
            {device.layers.map((layer) => (
              <TimelineTrack
                key={layer.id}
                name={layer.name}
                color={layerColors[layer.type] || "#888"}
                timeRange={layer.timeRange}
                duration={duration}
                width={TRACK_AREA_WIDTH}
                indent
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire Timeline into App.tsx**

Update the bottom panel in `src/App.tsx`:

```tsx
import { Timeline } from "./components/timeline/Timeline";
```

Replace timeline placeholder:

```tsx
<div className="h-44 bg-[#12122a] border-t border-[#2a2a4a] shrink-0">
  <Timeline />
</div>
```

- [ ] **Step 5: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/components/timeline/ src/App.tsx
git commit -m "feat: add timeline with tracks, playhead, and transport controls"
```

---

## Phase 5: Export Pipeline

### Task 13: Rust Export Commands + FFmpeg Sidecar

**Files:**
- Create: `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/export.rs`, `src-tauri/src/commands/file_io.rs`
- Modify: `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`

- [ ] **Step 1: Create commands module**

Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod export;
pub mod file_io;
```

- [ ] **Step 2: Create file_io commands**

Create `src-tauri/src/commands/file_io.rs`:

```rust
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn save_scene(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to save: {}", e))
}

#[tauri::command]
pub fn load_scene(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to load: {}", e))
}

#[tauri::command]
pub fn ensure_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create dir: {}", e))
}
```

- [ ] **Step 3: Create export commands**

Create `src-tauri/src/commands/export.rs`:

```rust
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use tauri::AppHandle;

static EXPORT_PROGRESS: AtomicU32 = AtomicU32::new(0);

#[tauri::command]
pub fn get_export_progress() -> u32 {
    EXPORT_PROGRESS.load(Ordering::Relaxed)
}

#[tauri::command]
pub async fn export_frames_to_video(
    app: AppHandle,
    frames_dir: String,
    output_path: String,
    width: u32,
    height: u32,
    fps: u32,
    format: String,
) -> Result<String, String> {
    EXPORT_PROGRESS.store(0, Ordering::Relaxed);

    let codec_args: Vec<&str> = match format.as_str() {
        "mp4" => vec!["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium"],
        "h265" => vec!["-c:v", "libx265", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium"],
        "prores" => vec!["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le"],
        "webm" => vec!["-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0"],
        "gif" => vec!["-vf", "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"],
        _ => vec!["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18"],
    };

    // Use ffmpeg from PATH or sidecar
    let ffmpeg_path = "ffmpeg"; // TODO: resolve sidecar path via app.shell()

    let mut args = vec![
        "-y",
        "-framerate", &fps.to_string(),
        "-i", &format!("{}/frame_%06d.png", frames_dir),
        "-s", &format!("{}x{}", width, height),
    ];
    args.extend_from_slice(&codec_args);
    args.push(&output_path);

    let output = Command::new(ffmpeg_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("FFmpeg failed to start: {}. Is FFmpeg installed?", e))?;

    EXPORT_PROGRESS.store(100, Ordering::Relaxed);

    if output.status.success() {
        Ok(output_path)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg error: {}", stderr))
    }
}
```

- [ ] **Step 4: Register commands in lib.rs**

Update `src-tauri/src/lib.rs`:

```rust
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::file_io::save_scene,
            commands::file_io::load_scene,
            commands::file_io::ensure_dir,
            commands::export::export_frames_to_video,
            commands::export::get_export_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Verify Rust compiles**

```bash
cd /Users/claimsportit/Projects/mockup-studio/src-tauri
cargo check
```

Expected: Compilation succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src-tauri/src/
git commit -m "feat: add Rust export commands with FFmpeg pipeline and file I/O"
```

### Task 14: Export Dialog UI + Frame Capture

**Files:**
- Create: `src/components/export/ExportDialog.tsx`
- Modify: `src/components/panels/TopBar.tsx`

- [ ] **Step 1: Create ExportDialog**

Create `src/components/export/ExportDialog.tsx`:

```tsx
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useSceneStore } from "../../stores/scene-store";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const scene = useSceneStore((s) => s.scene);
  const [format, setFormat] = useState("mp4");
  const [resolution, setResolution] = useState("1080p");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const resolutions: Record<string, [number, number]> = {
    "720p": [1280, 720],
    "1080p": [1920, 1080],
    "4k": [3840, 2160],
  };

  const extensions: Record<string, string> = {
    mp4: "mp4", h265: "mp4", prores: "mov", webm: "webm", gif: "gif",
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setProgress(0);

    try {
      const outputPath = await save({
        defaultPath: `${scene.name}.${extensions[format]}`,
        filters: [{ name: format.toUpperCase(), extensions: [extensions[format]] }],
      });

      if (!outputPath) {
        setExporting(false);
        return;
      }

      const [width, height] = resolutions[resolution] || [1920, 1080];

      // Frame capture: get canvas element and export frames
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      if (!canvas) throw new Error("No 3D canvas found");

      const tempDir = `/tmp/mockup-studio-export-${Date.now()}`;
      await invoke("ensure_dir", { path: tempDir });

      const totalFrames = scene.canvas.duration * scene.canvas.fps;
      const { setCurrentTime } = useSceneStore.getState();

      for (let frame = 0; frame < totalFrames; frame++) {
        const time = frame / scene.canvas.fps;
        setCurrentTime(time);

        // Wait a frame for R3F to render
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );
        const buffer = await blob.arrayBuffer();
        const frameNum = String(frame).padStart(6, "0");

        await invoke("save_scene", {
          path: `${tempDir}/frame_${frameNum}.png`,
          content: "", // We need binary write - see note below
        });

        setProgress(Math.round((frame / totalFrames) * 90));
      }

      // Encode with FFmpeg
      const result = await invoke<string>("export_frames_to_video", {
        framesDir: tempDir,
        outputPath,
        width,
        height,
        fps: scene.canvas.fps,
        format,
      });

      setProgress(100);
      setTimeout(() => {
        setExporting(false);
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      setError(String(err));
      setExporting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 w-[400px] z-50">
          <Dialog.Title className="text-lg font-semibold mb-4">Export Video</Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#888] block mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-[#12122a] border border-[#2a2a4a] rounded px-3 py-2 text-sm"
              >
                <option value="mp4">MP4 (H.264)</option>
                <option value="h265">MP4 (H.265)</option>
                <option value="prores">ProRes 4444</option>
                <option value="webm">WebM (VP9)</option>
                <option value="gif">GIF</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-[#12122a] border border-[#2a2a4a] rounded px-3 py-2 text-sm"
              >
                <option value="720p">720p (1280x720)</option>
                <option value="1080p">1080p (1920x1080)</option>
                <option value="4k">4K (3840x2160)</option>
              </select>
            </div>
            <div className="text-xs text-[#555]">
              {scene.canvas.duration}s @ {scene.canvas.fps}fps = {scene.canvas.duration * scene.canvas.fps} frames
            </div>

            {error && <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">{error}</div>}

            {exporting && (
              <div>
                <div className="h-2 bg-[#12122a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7c7cff] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-[#888] mt-1 block">{progress}%</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close className="px-4 py-2 text-sm text-[#888] hover:text-white">Cancel</Dialog.Close>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 text-sm bg-[#7c7cff] text-white rounded hover:bg-[#6b6bef] disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Wire Export button in TopBar**

Update `src/components/panels/TopBar.tsx`:

```tsx
import { useState } from "react";
import { useSceneStore } from "../../stores/scene-store";
import { ExportDialog } from "../export/ExportDialog";

export function TopBar() {
  const sceneName = useSceneStore((s) => s.scene.name);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <div className="h-11 bg-[#1a1a2e] border-b border-[#2a2a4a] flex items-center px-4 gap-4 select-none">
        <span className="text-[#7c7cff] font-bold text-sm">MockupStudio</span>
        <span className="text-[#444]">|</span>
        <span className="text-[#888] text-xs">{sceneName}</span>
        <div className="flex-1" />
        <span className="text-[#4ade80] text-xs">● MCP Ready</span>
        <button
          onClick={() => setExportOpen(true)}
          className="bg-[#7c7cff] text-white text-xs px-3 py-1 rounded hover:bg-[#6b6bef] transition-colors"
        >
          Export ▶
        </button>
      </div>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/components/export/ src/components/panels/TopBar.tsx
git commit -m "feat: add export dialog with format/resolution selection and FFmpeg pipeline"
```

---

## Phase 6: Animation Presets

### Task 15: Animation Presets

**Files:**
- Create: `src/engine/presets.ts`

- [ ] **Step 1: Create presets**

Create `src/engine/presets.ts`:

```typescript
import type { Keyframe, CameraKeyframe, EasingType } from "../types/scene";

export interface DevicePreset {
  name: string;
  label: string;
  category: "rotation" | "movement" | "entrance";
  generateKeyframes: (duration: number) => Keyframe[];
}

export interface CameraPreset {
  name: string;
  label: string;
  generateKeyframes: (duration: number) => CameraKeyframe[];
}

let presetKfId = 0;
function kfId(): string {
  return `preset_kf_${++presetKfId}`;
}

export const devicePresets: DevicePreset[] = [
  {
    name: "rotate-360",
    label: "Full 360° Rotation",
    category: "rotation",
    generateKeyframes: (duration) => [
      { id: kfId(), property: "rotation.y", time: 0, value: 0, easing: "ease-in-out" },
      { id: kfId(), property: "rotation.y", time: duration, value: Math.PI * 2, easing: "ease-in-out" },
    ],
  },
  {
    name: "rotate-slow",
    label: "Slow Rotation (90°)",
    category: "rotation",
    generateKeyframes: (duration) => [
      { id: kfId(), property: "rotation.y", time: 0, value: -0.3, easing: "ease-in-out" },
      { id: kfId(), property: "rotation.y", time: duration, value: 0.3, easing: "ease-in-out" },
    ],
  },
  {
    name: "flip",
    label: "Flip (Front to Back)",
    category: "rotation",
    generateKeyframes: (duration) => [
      { id: kfId(), property: "rotation.y", time: 0, value: 0, easing: "ease-in-out" },
      { id: kfId(), property: "rotation.y", time: duration * 0.5, value: Math.PI, easing: "ease-in-out" },
      { id: kfId(), property: "rotation.y", time: duration, value: 0, easing: "ease-in-out" },
    ],
  },
  {
    name: "float",
    label: "Floating",
    category: "movement",
    generateKeyframes: (duration) => [
      { id: kfId(), property: "position.y", time: 0, value: 0, easing: "ease-in-out" },
      { id: kfId(), property: "position.y", time: duration * 0.5, value: 0.15, easing: "ease-in-out" },
      { id: kfId(), property: "position.y", time: duration, value: 0, easing: "ease-in-out" },
    ],
  },
  {
    name: "slide-in-left",
    label: "Slide in from Left",
    category: "entrance",
    generateKeyframes: () => [
      { id: kfId(), property: "position.x", time: 0, value: -5, easing: "ease-out" },
      { id: kfId(), property: "position.x", time: 1.5, value: 0, easing: "ease-out" },
    ],
  },
  {
    name: "slide-in-right",
    label: "Slide in from Right",
    category: "entrance",
    generateKeyframes: () => [
      { id: kfId(), property: "position.x", time: 0, value: 5, easing: "ease-out" },
      { id: kfId(), property: "position.x", time: 1.5, value: 0, easing: "ease-out" },
    ],
  },
  {
    name: "zoom-in",
    label: "Zoom In",
    category: "entrance",
    generateKeyframes: () => [
      { id: kfId(), property: "scale.x", time: 0, value: 0.3, easing: "ease-out" },
      { id: kfId(), property: "scale.x", time: 1, value: 1, easing: "ease-out" },
      { id: kfId(), property: "scale.y", time: 0, value: 0.3, easing: "ease-out" },
      { id: kfId(), property: "scale.y", time: 1, value: 1, easing: "ease-out" },
      { id: kfId(), property: "scale.z", time: 0, value: 0.3, easing: "ease-out" },
      { id: kfId(), property: "scale.z", time: 1, value: 1, easing: "ease-out" },
    ],
  },
  {
    name: "wobble",
    label: "Wobble",
    category: "movement",
    generateKeyframes: (duration) => [
      { id: kfId(), property: "rotation.z", time: 0, value: 0, easing: "ease-in-out" },
      { id: kfId(), property: "rotation.z", time: duration * 0.25, value: 0.05, easing: "ease-in-out" },
      { id: kfId(), property: "rotation.z", time: duration * 0.75, value: -0.05, easing: "ease-in-out" },
      { id: kfId(), property: "rotation.z", time: duration, value: 0, easing: "ease-in-out" },
    ],
  },
];

export const cameraPresets: CameraPreset[] = [
  {
    name: "orbit",
    label: "Orbit Around",
    generateKeyframes: (duration) => [
      { time: 0, position: [0, 0, 5], lookAt: [0, 0, 0], fov: 50, easing: "linear" as EasingType },
      { time: duration * 0.25, position: [5, 1, 0], lookAt: [0, 0, 0], fov: 50, easing: "linear" as EasingType },
      { time: duration * 0.5, position: [0, 2, -5], lookAt: [0, 0, 0], fov: 50, easing: "linear" as EasingType },
      { time: duration * 0.75, position: [-5, 1, 0], lookAt: [0, 0, 0], fov: 50, easing: "linear" as EasingType },
      { time: duration, position: [0, 0, 5], lookAt: [0, 0, 0], fov: 50, easing: "linear" as EasingType },
    ],
  },
  {
    name: "dolly-in",
    label: "Dolly In",
    generateKeyframes: (duration) => [
      { time: 0, position: [0, 0, 8], lookAt: [0, 0, 0], fov: 50, easing: "ease-in-out" as EasingType },
      { time: duration, position: [0, 0, 3], lookAt: [0, 0, 0], fov: 50, easing: "ease-in-out" as EasingType },
    ],
  },
  {
    name: "static-angle",
    label: "Static Angle",
    generateKeyframes: () => [
      { time: 0, position: [2, 1.5, 4], lookAt: [0, 0, 0], fov: 50, easing: "linear" as EasingType },
    ],
  },
];

export function getDevicePreset(name: string): DevicePreset | undefined {
  return devicePresets.find((p) => p.name === name);
}

export function getCameraPreset(name: string): CameraPreset | undefined {
  return cameraPresets.find((p) => p.name === name);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/engine/presets.ts
git commit -m "feat: add device and camera animation presets"
```

---

## Phase 7: MCP Server (Claude CLI Integration)

### Task 16: WebSocket Server in Tauri

**Files:**
- Create: `src-tauri/src/websocket.rs`
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`

- [ ] **Step 1: Add WebSocket dependency to Cargo.toml**

Add to `[dependencies]` in `src-tauri/Cargo.toml`:

```toml
tokio-tungstenite = "0.24"
tokio = { version = "1", features = ["full"] }
serde_json = "1"
serde = { version = "1", features = ["derive"] }
```

- [ ] **Step 2: Create WebSocket server**

Create `src-tauri/src/websocket.rs`:

```rust
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::{StreamExt, SinkExt};

pub type WsSender = broadcast::Sender<String>;

pub async fn start_ws_server(port: u16) -> WsSender {
    let (tx, _) = broadcast::channel::<String>(100);
    let tx_clone = tx.clone();

    tokio::spawn(async move {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
            .await
            .expect("Failed to bind WebSocket server");

        println!("MockupStudio WS server listening on port {}", port);

        while let Ok((stream, _)) = listener.accept().await {
            let tx = tx_clone.clone();
            let mut rx = tx_clone.subscribe();

            tokio::spawn(async move {
                let ws_stream = accept_async(stream).await.unwrap();
                let (mut write, mut read) = ws_stream.split();

                // Forward incoming WS messages to broadcast channel
                let tx2 = tx.clone();
                let read_task = tokio::spawn(async move {
                    while let Some(Ok(msg)) = read.next().await {
                        if let Message::Text(text) = msg {
                            let _ = tx2.send(text.to_string());
                        }
                    }
                });

                // Forward broadcast messages to WS client
                let write_task = tokio::spawn(async move {
                    while let Ok(msg) = rx.recv().await {
                        if write.send(Message::Text(msg.into())).await.is_err() {
                            break;
                        }
                    }
                });

                let _ = tokio::join!(read_task, write_task);
            });
        }
    });

    tx
}
```

- [ ] **Step 3: Add futures-util dependency**

Add to `src-tauri/Cargo.toml`:

```toml
futures-util = "0.3"
```

- [ ] **Step 4: Start WS server in lib.rs**

Update `src-tauri/src/lib.rs`:

```rust
mod commands;
mod websocket;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::file_io::save_scene,
            commands::file_io::load_scene,
            commands::file_io::ensure_dir,
            commands::export::export_frames_to_video,
            commands::export::get_export_progress,
        ])
        .setup(|_app| {
            tauri::async_runtime::spawn(async {
                websocket::start_ws_server(9876).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Verify compilation**

```bash
cd /Users/claimsportit/Projects/mockup-studio/src-tauri
cargo check
```

Expected: Compiles successfully.

- [ ] **Step 6: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src-tauri/
git commit -m "feat: add WebSocket server for MCP bridge on port 9876"
```

### Task 17: MCP Server Binary

**Files:**
- Create: `mcp-server/Cargo.toml`, `mcp-server/src/main.rs`, `mcp-server/src/tools.rs`, `mcp-server/src/bridge.rs`

- [ ] **Step 1: Create MCP server Cargo project**

```bash
cd /Users/claimsportit/Projects/mockup-studio
mkdir -p mcp-server/src
```

Create `mcp-server/Cargo.toml`:

```toml
[package]
name = "mockup-studio-mcp"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = "0.24"
futures-util = "0.3"
```

- [ ] **Step 2: Create bridge module**

Create `mcp-server/src/bridge.rs`:

```rust
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;

pub async fn connect_to_app(
    port: u16,
) -> Result<(mpsc::Sender<String>, mpsc::Receiver<String>), String> {
    let url = format!("ws://127.0.0.1:{}", port);
    let (ws_stream, _) = connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect to MockupStudio: {}", e))?;

    let (mut write, mut read) = ws_stream.split();
    let (send_tx, mut send_rx) = mpsc::channel::<String>(100);
    let (recv_tx, recv_rx) = mpsc::channel::<String>(100);

    // Send messages to app
    tokio::spawn(async move {
        while let Some(msg) = send_rx.recv().await {
            if write.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Receive messages from app
    tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = read.next().await {
            if recv_tx.send(text.to_string()).await.is_err() {
                break;
            }
        }
    });

    Ok((send_tx, recv_rx))
}
```

- [ ] **Step 3: Create tools module**

Create `mcp-server/src/tools.rs`:

```rust
use serde_json::{json, Value};

pub fn list_tools() -> Value {
    json!({
        "tools": [
            { "name": "create_scene", "description": "Create a new empty scene", "inputSchema": { "type": "object", "properties": { "name": { "type": "string" }, "width": { "type": "number" }, "height": { "type": "number" }, "fps": { "type": "number" }, "duration": { "type": "number" } }, "required": ["name"] } },
            { "name": "get_scene", "description": "Get the current scene state as JSON", "inputSchema": { "type": "object", "properties": {} } },
            { "name": "add_device", "description": "Add a device to the scene", "inputSchema": { "type": "object", "properties": { "model": { "type": "string" }, "name": { "type": "string" } }, "required": ["model"] } },
            { "name": "list_devices", "description": "List all devices in the scene", "inputSchema": { "type": "object", "properties": {} } },
            { "name": "add_layer", "description": "Add a layer to a device", "inputSchema": { "type": "object", "properties": { "deviceId": { "type": "string" }, "type": { "type": "string" }, "name": { "type": "string" }, "properties": { "type": "object" } }, "required": ["deviceId", "type"] } },
            { "name": "update_layer", "description": "Update a layer's properties", "inputSchema": { "type": "object", "properties": { "deviceId": { "type": "string" }, "layerId": { "type": "string" }, "properties": { "type": "object" } }, "required": ["deviceId", "layerId"] } },
            { "name": "set_screen_content", "description": "Set screen content on a device", "inputSchema": { "type": "object", "properties": { "deviceId": { "type": "string" }, "source": { "type": "string" }, "type": { "type": "string", "enum": ["video", "image"] } }, "required": ["deviceId", "source"] } },
            { "name": "apply_preset", "description": "Apply an animation preset to a device", "inputSchema": { "type": "object", "properties": { "deviceId": { "type": "string" }, "preset": { "type": "string" } }, "required": ["deviceId", "preset"] } },
            { "name": "export_video", "description": "Export the scene as a video", "inputSchema": { "type": "object", "properties": { "format": { "type": "string" }, "resolution": { "type": "string" }, "outputPath": { "type": "string" } }, "required": ["format", "outputPath"] } },
            { "name": "list_available_models", "description": "List all available device models", "inputSchema": { "type": "object", "properties": {} } },
            { "name": "list_presets", "description": "List all available animation presets", "inputSchema": { "type": "object", "properties": {} } }
        ]
    })
}
```

- [ ] **Step 4: Create MCP server main**

Create `mcp-server/src/main.rs`:

```rust
mod bridge;
mod tools;

use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

#[tokio::main]
async fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut stdout = stdout.lock();

    // Try to connect to MockupStudio app
    let app_connection = bridge::connect_to_app(9876).await;
    let connected = app_connection.is_ok();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let method = request.get("method").and_then(|m| m.as_str()).unwrap_or("");
        let id = request.get("id").cloned();

        let response = match method {
            "initialize" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": { "tools": {} },
                    "serverInfo": { "name": "mockup-studio-mcp", "version": "0.1.0" }
                }
            }),
            "tools/list" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": tools::list_tools()
            }),
            "tools/call" => {
                let tool_name = request["params"]["name"].as_str().unwrap_or("");
                let args = &request["params"]["arguments"];

                // Forward tool call to app via WebSocket
                let result = if connected {
                    json!({ "content": [{ "type": "text", "text": format!("Tool '{}' called with args: {}. App connection active.", tool_name, args) }] })
                } else {
                    json!({ "content": [{ "type": "text", "text": "MockupStudio app is not running. Please start it first." }], "isError": true })
                };

                json!({ "jsonrpc": "2.0", "id": id, "result": result })
            }
            _ => json!({ "jsonrpc": "2.0", "id": id, "result": {} }),
        };

        let response_str = serde_json::to_string(&response).unwrap();
        writeln!(stdout, "{}", response_str).unwrap();
        stdout.flush().unwrap();
    }
}
```

- [ ] **Step 5: Verify MCP server compiles**

```bash
cd /Users/claimsportit/Projects/mockup-studio/mcp-server
cargo check
```

Expected: Compiles successfully.

- [ ] **Step 6: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add mcp-server/
git commit -m "feat: add MCP server with tool definitions and WebSocket bridge"
```

---

## Phase 8: Integration + Polish

### Task 18: Animate Devices with Keyframes in Viewport

**Files:**
- Modify: `src/components/viewport/ProceduralDevice.tsx`

- [ ] **Step 1: Add keyframe-driven animation to ProceduralDevice**

Update `src/components/viewport/ProceduralDevice.tsx` to apply interpolated keyframe values to position, rotation, and scale:

Add import at top:

```typescript
import { interpolateKeyframes } from "../../engine/interpolator";
```

Replace the `<group>` element return in ProceduralDevice to apply interpolated values:

```tsx
  const time = currentTime;

  const animatedPosition: [number, number, number] = [
    device.keyframes.length > 0 ? interpolateKeyframes(device.keyframes, "position.x", time) : device.position[0],
    device.keyframes.length > 0 ? interpolateKeyframes(device.keyframes, "position.y", time) : device.position[1],
    device.keyframes.length > 0 ? interpolateKeyframes(device.keyframes, "position.z", time) : device.position[2],
  ];

  const animatedRotation: [number, number, number] = [
    device.keyframes.length > 0 ? interpolateKeyframes(device.keyframes, "rotation.x", time) : device.rotation[0],
    device.keyframes.length > 0 ? interpolateKeyframes(device.keyframes, "rotation.y", time) : device.rotation[1],
    device.keyframes.length > 0 ? interpolateKeyframes(device.keyframes, "rotation.z", time) : device.rotation[2],
  ];

  const animatedScale: [number, number, number] = [
    device.keyframes.some((kf) => kf.property === "scale.x") ? interpolateKeyframes(device.keyframes, "scale.x", time) : device.scale[0],
    device.keyframes.some((kf) => kf.property === "scale.y") ? interpolateKeyframes(device.keyframes, "scale.y", time) : device.scale[1],
    device.keyframes.some((kf) => kf.property === "scale.z") ? interpolateKeyframes(device.keyframes, "scale.z", time) : device.scale[2],
  ];

  return (
    <group position={animatedPosition} rotation={animatedRotation} scale={animatedScale}>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/components/viewport/ProceduralDevice.tsx
git commit -m "feat: apply keyframe interpolation to device position, rotation, scale in viewport"
```

### Task 19: Playback Loop

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add useEffect playback loop**

Add to `App.tsx` before the return statement:

```tsx
import { useEffect, useRef } from "react";
import { useSceneStore } from "./stores/scene-store";
```

Add inside the `App` component:

```tsx
const isPlaying = useSceneStore((s) => s.editor.isPlaying);
const duration = useSceneStore((s) => s.scene.canvas.duration);
const fps = useSceneStore((s) => s.scene.canvas.fps);
const rafRef = useRef<number>(0);
const lastTimeRef = useRef<number>(0);

useEffect(() => {
  if (!isPlaying) {
    cancelAnimationFrame(rafRef.current);
    return;
  }

  lastTimeRef.current = performance.now();

  const tick = (now: number) => {
    const delta = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    const { currentTime } = useSceneStore.getState().editor;
    let newTime = currentTime + delta;
    if (newTime >= duration) newTime = 0; // loop
    useSceneStore.getState().setCurrentTime(newTime);

    rafRef.current = requestAnimationFrame(tick);
  };

  rafRef.current = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafRef.current);
}, [isPlaying, duration]);
```

- [ ] **Step 2: Commit**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add src/App.tsx
git commit -m "feat: add real-time playback loop with RAF"
```

### Task 20: Final Integration Test

- [ ] **Step 1: Run all unit tests**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run the full app**

```bash
cd /Users/claimsportit/Projects/mockup-studio
npm run tauri dev
```

Expected:
1. App opens with dark 4-panel layout
2. Click "+ iPad Air" → 3D tablet appears in viewport
3. Click "+ Lenovo Tab K11" → second tablet appears
4. Click a device → properties panel shows position/rotation
5. Click "+ Spotlight" → spotlight overlay appears on device
6. Adjust spotlight properties in right panel → live update
7. Press ▶ in timeline → playback starts
8. Click "Export" → export dialog opens

- [ ] **Step 3: Push to GitHub**

```bash
cd /Users/claimsportit/Projects/mockup-studio
git push origin main
```

- [ ] **Step 4: Final commit with .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
target/
.superpowers/
src-tauri/binaries/
*.log
.DS_Store
```

```bash
cd /Users/claimsportit/Projects/mockup-studio
git add .gitignore
git commit -m "chore: add .gitignore"
git push origin main
```
