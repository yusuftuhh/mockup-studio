// ── Primitives ──────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

// ── Animation ───────────────────────────────────────────────────────────────

export type EasingType =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring"
  | "bounce"
  | "step";

export interface Keyframe {
  id: string;
  property: string;
  time: number;
  value: number;
  easing: EasingType;
}

export type AnimationType = "fade" | "slide" | "scale" | "bounce" | "none";

export interface AnimationConfig {
  entry: AnimationType;
  exit: AnimationType;
  easing: EasingType;
}

// ── Layer Types ─────────────────────────────────────────────────────────────

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
    sourceRegion: { x: number; y: number; w: number; h: number };
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
    region: { x: number; y: number; w: number; h: number };
    source: string;
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
    path: Vec2[];
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

// ── Device ──────────────────────────────────────────────────────────────────

export type DeviceType = "gltf" | "procedural";

export type MaterialType = "matte" | "glossy" | "metallic";

export interface ProceduralParams {
  width: number;
  height: number;
  screenWidth: number;
  screenHeight: number;
  bezelTop: number;
  bezelBottom: number;
  bezelSide: number;
  cornerRadius: number;
  thickness: number;
  color: string;
  material: MaterialType;
}

export interface ScreenContent {
  type: "video" | "image";
  source: string;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  model: string;
  proceduralParams: ProceduralParams | null;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  screenContent: ScreenContent | null;
  layers: Layer[];
  keyframes: Keyframe[];
}

// ── Camera ──────────────────────────────────────────────────────────────────

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

// ── Environment ─────────────────────────────────────────────────────────────

export interface Environment {
  type: "studio" | "sunset" | "dawn" | "night" | "none";
  intensity: number;
  background: string;
}

// ── Scene ───────────────────────────────────────────────────────────────────

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

// ── Editor State ────────────────────────────────────────────────────────────

export interface EditorState {
  selectedDeviceId: string | null;
  selectedLayerId: string | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  snapInterval: number;
}
