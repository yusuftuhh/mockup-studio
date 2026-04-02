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

  const screenTexture = useScreenTexture({
    screenWidth: device.proceduralParams?.screenWidth ?? 1920,
    screenHeight: device.proceduralParams?.screenHeight ?? 1080,
    screenContent: device.screenContent,
    layers: device.layers,
    currentTime,
  });

  // Find and apply screen texture to the screen mesh
  useEffect(() => {
    if (!screenTexture || !clonedScene) return;

    // Strategy: find the mesh that is most likely the screen
    // - It should be one of the larger flat meshes
    // - Typically has a dark/black material (screen off = black)
    let screenMesh: THREE.Mesh | null = null;
    let screenScore = -1;

    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox;
      if (!box) return;

      const size = new THREE.Vector3();
      box.getSize(size);

      // Score: prefer large, flat surfaces
      const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
      const flatness = dims[0] * dims[1] / (dims[2] + 0.001); // larger = flatter
      const area = dims[0] * dims[1];

      let score = area * flatness;

      // Bonus for dark materials (screens are usually dark/black)
      const mat = child.material;
      if (mat instanceof THREE.MeshStandardMaterial && mat.color) {
        const brightness = mat.color.r + mat.color.g + mat.color.b;
        if (brightness < 0.5) score *= 2;
      }

      // Check mesh name for hints
      const name = child.name.toLowerCase();
      if (name.includes("screen") || name.includes("display")) score *= 10;

      if (score > screenScore) {
        screenScore = score;
        screenMesh = child;
      }
    });

    if (screenMesh) {
      const mesh = screenMesh as THREE.Mesh;
      const newMat = new THREE.MeshBasicMaterial({
        map: screenTexture,
        toneMapped: false,
      });
      mesh.material = newMat;
    }
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
