import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useScreenTexture } from "./ScreenTexture";
import { interpolateKeyframes } from "../../engine/interpolator";
import type { Device, Vec3 } from "../../types/scene";
import { useSceneStore } from "../../stores/scene-store";

interface GltfDeviceProps {
  device: Device;
}

const MODEL_CONFIG: Record<
  string,
  {
    path: string;
    scale: number;
    rotation?: [number, number, number];
  }
> = {
  "iphone-15-pro": {
    path: "/models/iphone-15-pro.glb",
    scale: 0.35,
  },
  "ipad-pro-3d": {
    path: "/models/ipad-pro.glb",
    scale: 0.015,
  },
  "tablet-3d": {
    path: "/models/tablet.glb",
    scale: 0.012,
  },
};

export default function GltfDevice({ device }: GltfDeviceProps) {
  const currentTime = useSceneStore((s) => s.editor.currentTime);
  const config = device.model ? MODEL_CONFIG[device.model] : null;

  if (!config) return null;

  const { scene: gltfScene } = useGLTF(config.path);
  const clonedScene = useMemo(() => {
    const clone = gltfScene.clone(true);

    // Fix materials: reduce extreme reflections, improve look
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Handle both single and array materials
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((mat, idx) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
            const cloned = mat.clone();
            // Tone down extreme metalness/reflections
            cloned.metalness = Math.min(cloned.metalness, 0.6);
            cloned.roughness = Math.max(cloned.roughness, 0.25);
            // Remove excessive environment map intensity
            cloned.envMapIntensity = 0.5;
            if (Array.isArray(child.material)) {
              child.material[idx] = cloned;
            } else {
              child.material = cloned;
            }
          }
        });
      }
    });

    return clone;
  }, [gltfScene]);

  // Use proper pixel resolution for the canvas, not mm dimensions
  const SCREEN_PX: Record<string, [number, number]> = {
    "ipad-pro-3d": [2064, 2752],
    "iphone-15-pro": [1206, 2622],
    "tablet-3d": [1600, 2560],
  };
  const [resPx, resPy] = device.model && SCREEN_PX[device.model]
    ? SCREEN_PX[device.model]
    : [1920, 1080];

  const screenTexture = useScreenTexture({
    screenWidth: resPx,
    screenHeight: resPy,
    screenContent: device.screenContent,
    layers: device.layers,
    currentTime,
  });

  // Apply screen texture to all meshes that look like screens
  useEffect(() => {
    if (!screenTexture || !clonedScene) return;

    // Log mesh structure for debugging
    const meshes: { name: string; area: number; flatness: number; dark: boolean }[] = [];

    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox;
      if (!box) return;

      const size = new THREE.Vector3();
      box.getSize(size);
      const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
      const flatness = dims[2] < 0.01 ? 1000 : dims[0] * dims[1] / dims[2];
      const area = dims[0] * dims[1];

      let isDark = false;
      const mat = child.material;
      if (mat instanceof THREE.MeshStandardMaterial && mat.color) {
        isDark = (mat.color.r + mat.color.g + mat.color.b) < 0.3;
      }

      meshes.push({ name: child.name, area, flatness, dark: isDark });

      // Apply screen texture to mesh if it matches screen criteria:
      // - Name contains screen/display/glass
      // - OR: large flat surface with dark material
      const name = child.name.toLowerCase();
      const isScreenByName = name.includes("screen") || name.includes("display") || name.includes("glass") || name.includes("lcd");
      const isScreenByGeometry = area > 0.1 && flatness > 50 && isDark;

      if (isScreenByName || isScreenByGeometry) {
        child.material = new THREE.MeshBasicMaterial({
          map: screenTexture,
          toneMapped: false,
        });
      }
    });

    console.log("[MockupStudio] GLTF meshes:", meshes);
  }, [screenTexture, clonedScene]);

  // Keyframe animation
  const hasKf = device.keyframes.length > 0;
  const kfs = device.keyframes;

  const animatedPosition: Vec3 = useMemo(() => {
    if (!hasKf) return device.position;
    return [
      kfs.some((k) => k.property === "position.x")
        ? interpolateKeyframes(kfs, "position.x", currentTime) : device.position[0],
      kfs.some((k) => k.property === "position.y")
        ? interpolateKeyframes(kfs, "position.y", currentTime) : device.position[1],
      kfs.some((k) => k.property === "position.z")
        ? interpolateKeyframes(kfs, "position.z", currentTime) : device.position[2],
    ];
  }, [hasKf, kfs, device.position, currentTime]);

  const animatedRotation: Vec3 = useMemo(() => {
    if (!hasKf) return device.rotation;
    return [
      kfs.some((k) => k.property === "rotation.x")
        ? interpolateKeyframes(kfs, "rotation.x", currentTime) : device.rotation[0],
      kfs.some((k) => k.property === "rotation.y")
        ? interpolateKeyframes(kfs, "rotation.y", currentTime) : device.rotation[1],
      kfs.some((k) => k.property === "rotation.z")
        ? interpolateKeyframes(kfs, "rotation.z", currentTime) : device.rotation[2],
    ];
  }, [hasKf, kfs, device.rotation, currentTime]);

  const animatedScale: Vec3 = useMemo(() => {
    if (!hasKf) return device.scale;
    return [
      kfs.some((k) => k.property === "scale.x")
        ? interpolateKeyframes(kfs, "scale.x", currentTime) : device.scale[0],
      kfs.some((k) => k.property === "scale.y")
        ? interpolateKeyframes(kfs, "scale.y", currentTime) : device.scale[1],
      kfs.some((k) => k.property === "scale.z")
        ? interpolateKeyframes(kfs, "scale.z", currentTime) : device.scale[2],
    ];
  }, [hasKf, kfs, device.scale, currentTime]);

  return (
    <group
      position={animatedPosition}
      rotation={animatedRotation}
      scale={animatedScale}
    >
      <primitive
        object={clonedScene}
        scale={config.scale}
        rotation={config.rotation || [0, 0, 0]}
      />
    </group>
  );
}

Object.values(MODEL_CONFIG).forEach((c) => useGLTF.preload(c.path));
