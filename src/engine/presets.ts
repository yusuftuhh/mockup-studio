import type { Keyframe, CameraKeyframe, EasingType } from "../types/scene";

// ── Helpers ──────────────────────────────────────────────────────────────────

let presetCounter = 0;
function kfId(): string {
  presetCounter += 1;
  return `preset_kf_${presetCounter}`;
}

function kf(
  property: string,
  time: number,
  value: number,
  easing: EasingType = "ease-in-out"
): Keyframe {
  return { id: kfId(), property, time, value, easing };
}

// ── Device Preset Type ───────────────────────────────────────────────────────

export interface DevicePreset {
  name: string;
  label: string;
  generateKeyframes: (duration: number) => Keyframe[];
}

// ── Device Presets ───────────────────────────────────────────────────────────

const rotate360: DevicePreset = {
  name: "rotate-360",
  label: "Rotate 360",
  generateKeyframes: (duration) => [
    kf("rotation.y", 0, 0, "linear"),
    kf("rotation.y", duration, Math.PI * 2, "linear"),
  ],
};

const rotateSlow: DevicePreset = {
  name: "rotate-slow",
  label: "Rotate Slow",
  generateKeyframes: (duration) => [
    kf("rotation.y", 0, -0.3, "ease-in-out"),
    kf("rotation.y", duration, 0.3, "ease-in-out"),
  ],
};

const flip: DevicePreset = {
  name: "flip",
  label: "Flip",
  generateKeyframes: (duration) => [
    kf("rotation.y", 0, 0, "ease-in-out"),
    kf("rotation.y", duration * 0.5, Math.PI, "ease-in-out"),
    kf("rotation.y", duration, 0, "ease-in-out"),
  ],
};

const float: DevicePreset = {
  name: "float",
  label: "Float",
  generateKeyframes: (duration) => [
    kf("position.y", 0, 0, "ease-in-out"),
    kf("position.y", duration * 0.5, 0.15, "ease-in-out"),
    kf("position.y", duration, 0, "ease-in-out"),
  ],
};

const slideInLeft: DevicePreset = {
  name: "slide-in-left",
  label: "Slide In Left",
  generateKeyframes: (duration) => [
    kf("position.x", 0, -5, "ease-out"),
    kf("position.x", duration, 0, "ease-out"),
  ],
};

const slideInRight: DevicePreset = {
  name: "slide-in-right",
  label: "Slide In Right",
  generateKeyframes: (duration) => [
    kf("position.x", 0, 5, "ease-out"),
    kf("position.x", duration, 0, "ease-out"),
  ],
};

const zoomIn: DevicePreset = {
  name: "zoom-in",
  label: "Zoom In",
  generateKeyframes: (duration) => [
    kf("scale.x", 0, 0.3, "ease-out"),
    kf("scale.y", 0, 0.3, "ease-out"),
    kf("scale.z", 0, 0.3, "ease-out"),
    kf("scale.x", duration, 1, "ease-out"),
    kf("scale.y", duration, 1, "ease-out"),
    kf("scale.z", duration, 1, "ease-out"),
  ],
};

const wobble: DevicePreset = {
  name: "wobble",
  label: "Wobble",
  generateKeyframes: (duration) => [
    kf("rotation.z", 0, 0, "ease-in-out"),
    kf("rotation.z", duration * 0.25, 0.05, "ease-in-out"),
    kf("rotation.z", duration * 0.75, -0.05, "ease-in-out"),
    kf("rotation.z", duration, 0, "ease-in-out"),
  ],
};

// ── Camera Preset Type ───────────────────────────────────────────────────────

export interface CameraPreset {
  name: string;
  label: string;
  generateKeyframes: (duration: number) => CameraKeyframe[];
}

// ── Camera Presets ───────────────────────────────────────────────────────────

const orbit: CameraPreset = {
  name: "orbit",
  label: "Orbit",
  generateKeyframes: (duration) => [
    {
      time: 0,
      position: [3, 1, 0],
      lookAt: [0, 0, 0],
      fov: 50,
      easing: "ease-in-out",
    },
    {
      time: duration * 0.25,
      position: [0, 1, 3],
      lookAt: [0, 0, 0],
      fov: 50,
      easing: "ease-in-out",
    },
    {
      time: duration * 0.5,
      position: [-3, 1, 0],
      lookAt: [0, 0, 0],
      fov: 50,
      easing: "ease-in-out",
    },
    {
      time: duration * 0.75,
      position: [0, 1, -3],
      lookAt: [0, 0, 0],
      fov: 50,
      easing: "ease-in-out",
    },
  ],
};

const dollyIn: CameraPreset = {
  name: "dolly-in",
  label: "Dolly In",
  generateKeyframes: (duration) => [
    {
      time: 0,
      position: [0, 1, 6],
      lookAt: [0, 0, 0],
      fov: 50,
      easing: "ease-in-out",
    },
    {
      time: duration,
      position: [0, 0.5, 2],
      lookAt: [0, 0, 0],
      fov: 50,
      easing: "ease-in-out",
    },
  ],
};

const staticAngle: CameraPreset = {
  name: "static-angle",
  label: "Static Angle",
  generateKeyframes: (_duration) => [
    {
      time: 0,
      position: [2, 1.5, 2],
      lookAt: [0, 0, 0],
      fov: 50,
      easing: "linear",
    },
  ],
};

// ── Exports ──────────────────────────────────────────────────────────────────

export const devicePresets: DevicePreset[] = [
  rotate360,
  rotateSlow,
  flip,
  float,
  slideInLeft,
  slideInRight,
  zoomIn,
  wobble,
];

export const cameraPresets: CameraPreset[] = [orbit, dollyIn, staticAngle];

export function getDevicePreset(name: string): DevicePreset | undefined {
  return devicePresets.find((p) => p.name === name);
}

export function getCameraPreset(name: string): CameraPreset | undefined {
  return cameraPresets.find((p) => p.name === name);
}
