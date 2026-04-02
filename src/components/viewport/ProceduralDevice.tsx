import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createProceduralGeometry } from "../../lib/procedural-geometry";
import { useScreenTexture } from "./ScreenTexture";
import { useScreenGizmo } from "./ScreenGizmo";
import { interpolateKeyframes } from "../../engine/interpolator";
import type { Device, Vec3 } from "../../types/scene";
import { useSceneStore } from "../../stores/scene-store";

interface ProceduralDeviceProps {
  device: Device;
}

function createRoundedRectShape(
  width: number,
  height: number,
  radius: number
): THREE.Shape {
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;

  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  return shape;
}

function getMaterialProps(materialType: string) {
  switch (materialType) {
    case "glossy":
      return { metalness: 0.3, roughness: 0.1 };
    case "metallic":
      return { metalness: 0.8, roughness: 0.2 };
    case "matte":
    default:
      return { metalness: 0.1, roughness: 0.7 };
  }
}

export default function ProceduralDevice({ device }: ProceduralDeviceProps) {
  const currentTime = useSceneStore((s) => s.editor.currentTime);
  const selectedLayerId = useSceneStore((s) => s.editor.selectedLayerId);
  const screenMeshRef = useRef<THREE.Mesh>(null);
  const params = device.proceduralParams;

  // Fallback for devices without procedural params
  if (!params) return null;

  const geo = useMemo(() => createProceduralGeometry(params), [params]);

  // screenWidth/screenHeight in params are in mm — convert to reasonable pixel resolution
  const canvasW = Math.round(params.screenWidth * 10);
  const canvasH = Math.round(params.screenHeight * 10);

  const selectedLayer = device.layers.find((l) => l.id === selectedLayerId) ?? null;

  const { hoveredHandle } = useScreenGizmo({
    screenMeshRef,
    canvasWidth: canvasW,
    canvasHeight: canvasH,
    deviceId: device.id,
  });

  const screenTexture = useScreenTexture({
    screenWidth: canvasW,
    screenHeight: canvasH,
    screenContent: device.screenContent,
    layers: device.layers,
    currentTime,
    selectedLayer,
    hoveredHandle,
  });

  const bodyGeometry = useMemo(() => {
    const shape = createRoundedRectShape(
      geo.bodyWidth,
      geo.bodyHeight,
      geo.cornerRadius
    );
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: geo.bodyDepth,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelOffset: 0,
      bevelSegments: 3,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [geo]);

  const matProps = getMaterialProps(geo.material);

  // ── Keyframe Animation (Task 18) ────────────────────────────────────────
  const hasKf = device.keyframes.length > 0;

  const animatedPosition: Vec3 = useMemo(() => {
    if (!hasKf) return device.position;
    const kfs = device.keyframes;
    const px = kfs.some((k) => k.property === "position.x")
      ? interpolateKeyframes(kfs, "position.x", currentTime)
      : device.position[0];
    const py = kfs.some((k) => k.property === "position.y")
      ? interpolateKeyframes(kfs, "position.y", currentTime)
      : device.position[1];
    const pz = kfs.some((k) => k.property === "position.z")
      ? interpolateKeyframes(kfs, "position.z", currentTime)
      : device.position[2];
    return [px, py, pz];
  }, [hasKf, device.keyframes, device.position, currentTime]);

  const animatedRotation: Vec3 = useMemo(() => {
    if (!hasKf) return device.rotation;
    const kfs = device.keyframes;
    const rx = kfs.some((k) => k.property === "rotation.x")
      ? interpolateKeyframes(kfs, "rotation.x", currentTime)
      : device.rotation[0];
    const ry = kfs.some((k) => k.property === "rotation.y")
      ? interpolateKeyframes(kfs, "rotation.y", currentTime)
      : device.rotation[1];
    const rz = kfs.some((k) => k.property === "rotation.z")
      ? interpolateKeyframes(kfs, "rotation.z", currentTime)
      : device.rotation[2];
    return [rx, ry, rz];
  }, [hasKf, device.keyframes, device.rotation, currentTime]);

  const animatedScale: Vec3 = useMemo(() => {
    if (!hasKf) return device.scale;
    const kfs = device.keyframes;
    const sx = kfs.some((k) => k.property === "scale.x")
      ? interpolateKeyframes(kfs, "scale.x", currentTime)
      : device.scale[0];
    const sy = kfs.some((k) => k.property === "scale.y")
      ? interpolateKeyframes(kfs, "scale.y", currentTime)
      : device.scale[1];
    const sz = kfs.some((k) => k.property === "scale.z")
      ? interpolateKeyframes(kfs, "scale.z", currentTime)
      : device.scale[2];
    return [sx, sy, sz];
  }, [hasKf, device.keyframes, device.scale, currentTime]);

  return (
    <group
      position={animatedPosition}
      rotation={animatedRotation.map((r) => (r * Math.PI) / 180) as [number, number, number]}
      scale={animatedScale}
    >
      {/* Device body */}
      <mesh geometry={bodyGeometry}>
        <meshStandardMaterial
          color={geo.color}
          metalness={matProps.metalness}
          roughness={matProps.roughness}
        />
      </mesh>

      {/* Screen plane on top of body */}
      <mesh ref={screenMeshRef} position={[0, 0, geo.bodyDepth + 0.001]}>
        <planeGeometry args={[geo.screenWidth, geo.screenHeight]} />
        <meshStandardMaterial
          map={screenTexture}
          metalness={0}
          roughness={0.4}
          emissive="#ffffff"
          emissiveIntensity={0.1}
          emissiveMap={screenTexture}
        />
      </mesh>
    </group>
  );
}
