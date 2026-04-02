import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useScreenTexture } from "./ScreenTexture";
import { interpolateKeyframes } from "../../engine/interpolator";
import type { Device, Vec3 } from "../../types/scene";
import { useSceneStore } from "../../stores/scene-store";

interface GltfDeviceProps {
  device: Device;
}

// Map model names to their GLB paths and screen mesh config
const MODEL_CONFIG: Record<
  string,
  {
    path: string;
    scale: number;
    screenMeshName?: string; // mesh name where screen texture goes
    screenScale?: [number, number]; // screen plane scale override
    screenOffset?: [number, number, number]; // screen position offset
    rotation?: [number, number, number]; // model rotation correction
  }
> = {
  "iphone-15-pro": {
    path: "/models/iphone-15-pro.glb",
    scale: 0.35,
    rotation: [0, 0, 0],
  },
  "tablet-3d": {
    path: "/models/tablet.glb",
    scale: 0.012,
    rotation: [0, 0, 0],
  },
};

export default function GltfDevice({ device }: GltfDeviceProps) {
  const currentTime = useSceneStore((s) => s.editor.currentTime);
  const config = device.model ? MODEL_CONFIG[device.model] : null;

  if (!config) return null;

  const { scene: gltfScene } = useGLTF(config.path);
  const clonedScene = useMemo(() => gltfScene.clone(true), [gltfScene]);

  const screenTexture = useScreenTexture({
    screenWidth: device.proceduralParams?.screenWidth ?? 1920,
    screenHeight: device.proceduralParams?.screenHeight ?? 1080,
    screenContent: device.screenContent,
    layers: device.layers,
    currentTime,
  });

  // Try to apply screen texture to the largest flat mesh (screen detection)
  useEffect(() => {
    if (!screenTexture || !clonedScene) return;

    let largestMesh: THREE.Mesh | null = null;
    let largestArea = 0;

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.computeBoundingBox();
        const box = child.geometry.boundingBox;
        if (box) {
          const size = new THREE.Vector3();
          box.getSize(size);
          const area = size.x * size.y;
          if (area > largestArea) {
            largestArea = area;
            largestMesh = child;
          }
        }
      }
    });

    // Apply screen texture to the largest face (likely the screen)
    if (largestMesh) {
      const mesh = largestMesh as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material = mesh.material.clone();
        mesh.material.map = screenTexture;
        mesh.material.emissive = new THREE.Color("#ffffff");
        mesh.material.emissiveIntensity = 0.15;
        mesh.material.emissiveMap = screenTexture;
        mesh.material.needsUpdate = true;
      }
    }
  }, [screenTexture, clonedScene]);

  // Keyframe animation
  const hasKf = device.keyframes.length > 0;

  const animatedPosition: Vec3 = useMemo(() => {
    if (!hasKf) return device.position;
    const kfs = device.keyframes;
    return [
      kfs.some((k) => k.property === "position.x")
        ? interpolateKeyframes(kfs, "position.x", currentTime)
        : device.position[0],
      kfs.some((k) => k.property === "position.y")
        ? interpolateKeyframes(kfs, "position.y", currentTime)
        : device.position[1],
      kfs.some((k) => k.property === "position.z")
        ? interpolateKeyframes(kfs, "position.z", currentTime)
        : device.position[2],
    ];
  }, [hasKf, device.keyframes, device.position, currentTime]);

  const animatedRotation: Vec3 = useMemo(() => {
    if (!hasKf) return device.rotation;
    const kfs = device.keyframes;
    return [
      kfs.some((k) => k.property === "rotation.x")
        ? interpolateKeyframes(kfs, "rotation.x", currentTime)
        : device.rotation[0],
      kfs.some((k) => k.property === "rotation.y")
        ? interpolateKeyframes(kfs, "rotation.y", currentTime)
        : device.rotation[1],
      kfs.some((k) => k.property === "rotation.z")
        ? interpolateKeyframes(kfs, "rotation.z", currentTime)
        : device.rotation[2],
    ];
  }, [hasKf, device.keyframes, device.rotation, currentTime]);

  const animatedScale: Vec3 = useMemo(() => {
    if (!hasKf) return device.scale;
    const kfs = device.keyframes;
    return [
      kfs.some((k) => k.property === "scale.x")
        ? interpolateKeyframes(kfs, "scale.x", currentTime)
        : device.scale[0],
      kfs.some((k) => k.property === "scale.y")
        ? interpolateKeyframes(kfs, "scale.y", currentTime)
        : device.scale[1],
      kfs.some((k) => k.property === "scale.z")
        ? interpolateKeyframes(kfs, "scale.z", currentTime)
        : device.scale[2],
    ];
  }, [hasKf, device.keyframes, device.scale, currentTime]);

  const modelRotation = config.rotation || [0, 0, 0];

  return (
    <group
      position={animatedPosition}
      rotation={animatedRotation}
      scale={animatedScale}
    >
      <primitive
        object={clonedScene}
        scale={config.scale}
        rotation={modelRotation}
      />
    </group>
  );
}

// Preload models
Object.values(MODEL_CONFIG).forEach((config) => {
  useGLTF.preload(config.path);
});
