import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useScreenTexture } from "./ScreenTexture";
import { useScreenGizmo } from "./ScreenGizmo";
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
    // Node name(s) that represent the screen — found by inspecting the GLB
    screenNodeNames: string[];
  }
> = {
  "iphone-15-pro": {
    path: "/models/iphone-15-pro.glb",
    scale: 0.35,
    screenNodeNames: ["front", "screen", "display", "glass"],
  },
  "ipad-pro-3d": {
    path: "/models/ipad-pro.glb",
    scale: 0.015,
    screenNodeNames: ["front"], // Node 4 in the iPad GLB = the screen
  },
  "tablet-3d": {
    path: "/models/tablet.glb",
    scale: 0.012,
    screenNodeNames: ["front", "screen", "display"],
  },
};

const SCREEN_PX: Record<string, [number, number]> = {
  "ipad-pro-3d": [2064, 2752],
  "iphone-15-pro": [1206, 2622],
  "tablet-3d": [1600, 2560],
};

export default function GltfDevice({ device }: GltfDeviceProps) {
  const currentTime = useSceneStore((s) => s.editor.currentTime);
  const selectedLayerId = useSceneStore((s) => s.editor.selectedLayerId);
  const config = device.model ? MODEL_CONFIG[device.model] : null;
  const screenMeshRef = useRef<THREE.Mesh>(null);

  if (!config) return null;

  const { scene: gltfScene } = useGLTF(config.path);

  const clonedScene = useMemo(() => {
    const clone = gltfScene.clone(true);
    // Tone down reflections on all meshes
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat, idx) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            const c = mat.clone();
            c.metalness = Math.min(c.metalness, 0.5);
            c.roughness = Math.max(c.roughness, 0.3);
            c.envMapIntensity = 0.4;
            if (Array.isArray(child.material)) child.material[idx] = c;
            else child.material = c;
          }
        });
      }
    });
    return clone;
  }, [gltfScene]);

  // Screen pixel resolution
  const [resPx, resPy] = device.model && SCREEN_PX[device.model]
    ? SCREEN_PX[device.model]
    : [1920, 1080];

  const selectedLayer = device.layers.find((l) => l.id === selectedLayerId) ?? null;

  const { hoveredHandle } = useScreenGizmo({
    screenMeshRef,
    canvasWidth: resPx,
    canvasHeight: resPy,
    deviceId: device.id,
  });

  const screenTexture = useScreenTexture({
    screenWidth: resPx,
    screenHeight: resPy,
    screenContent: device.screenContent,
    layers: device.layers,
    currentTime,
    selectedLayer,
    hoveredHandle,
  });

  // Find and apply screen texture to the correct mesh by node name
  useEffect(() => {
    if (!screenTexture || !clonedScene) return;

    const screenNames = new Set(config.screenNodeNames.map((n) => n.toLowerCase()));
    let foundScreen = false;

    clonedScene.traverse((child) => {
      // Match by node name (not mesh name)
      const nodeName = child.name.toLowerCase();
      const isScreen = screenNames.has(nodeName);

      if (isScreen && child instanceof THREE.Mesh) {
        // Replace ALL materials on this mesh with the screen texture
        const screenMat = new THREE.MeshBasicMaterial({
          map: screenTexture,
          toneMapped: false,
        });

        if (Array.isArray(child.material)) {
          child.material = child.material.map(() => screenMat);
        } else {
          child.material = screenMat;
        }

        // Store ref for raycasting (gizmo)
        screenMeshRef.current = child;
        foundScreen = true;
        console.log(`[MockupStudio] Screen texture applied to node "${child.name}"`);
      }
    });

    // Fallback: if no named screen found, apply to largest dark flat mesh
    if (!foundScreen) {
      let bestMesh: THREE.Mesh | null = null;
      let bestScore = 0;

      clonedScene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.computeBoundingBox();
        const box = child.geometry.boundingBox;
        if (!box) return;
        const size = new THREE.Vector3();
        box.getSize(size);
        const area = size.x * size.y + size.x * size.z + size.y * size.z;

        // Check if material is dark
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        let dark = false;
        if (mat instanceof THREE.MeshStandardMaterial && mat.color) {
          dark = (mat.color.r + mat.color.g + mat.color.b) < 0.3;
        }

        const score = area * (dark ? 3 : 1);
        if (score > bestScore) {
          bestScore = score;
          bestMesh = child;
        }
      });

      if (bestMesh) {
        const mesh = bestMesh as THREE.Mesh;
        const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(() => screenMat);
        else mesh.material = screenMat;
        screenMeshRef.current = mesh;
        console.log(`[MockupStudio] Screen texture applied to fallback mesh "${mesh.name}"`);
      }
    }
  }, [screenTexture, clonedScene, config.screenNodeNames]);

  // Keyframe animation
  const hasKf = device.keyframes.length > 0;
  const kfs = device.keyframes;

  const animatedPosition: Vec3 = useMemo(() => {
    if (!hasKf) return device.position;
    return [
      kfs.some((k) => k.property === "position.x") ? interpolateKeyframes(kfs, "position.x", currentTime) : device.position[0],
      kfs.some((k) => k.property === "position.y") ? interpolateKeyframes(kfs, "position.y", currentTime) : device.position[1],
      kfs.some((k) => k.property === "position.z") ? interpolateKeyframes(kfs, "position.z", currentTime) : device.position[2],
    ];
  }, [hasKf, kfs, device.position, currentTime]);

  const animatedRotation: Vec3 = useMemo(() => {
    if (!hasKf) return device.rotation;
    return [
      kfs.some((k) => k.property === "rotation.x") ? interpolateKeyframes(kfs, "rotation.x", currentTime) : device.rotation[0],
      kfs.some((k) => k.property === "rotation.y") ? interpolateKeyframes(kfs, "rotation.y", currentTime) : device.rotation[1],
      kfs.some((k) => k.property === "rotation.z") ? interpolateKeyframes(kfs, "rotation.z", currentTime) : device.rotation[2],
    ];
  }, [hasKf, kfs, device.rotation, currentTime]);

  const animatedScale: Vec3 = useMemo(() => {
    if (!hasKf) return device.scale;
    return [
      kfs.some((k) => k.property === "scale.x") ? interpolateKeyframes(kfs, "scale.x", currentTime) : device.scale[0],
      kfs.some((k) => k.property === "scale.y") ? interpolateKeyframes(kfs, "scale.y", currentTime) : device.scale[1],
      kfs.some((k) => k.property === "scale.z") ? interpolateKeyframes(kfs, "scale.z", currentTime) : device.scale[2],
    ];
  }, [hasKf, kfs, device.scale, currentTime]);

  return (
    <group position={animatedPosition} rotation={animatedRotation} scale={animatedScale}>
      <primitive object={clonedScene} scale={config.scale} rotation={config.rotation || [0, 0, 0]} />
    </group>
  );
}

Object.values(MODEL_CONFIG).forEach((c) => useGLTF.preload(c.path));
