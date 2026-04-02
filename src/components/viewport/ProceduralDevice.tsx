import { useMemo } from "react";
import * as THREE from "three";
import { createProceduralGeometry } from "../../lib/procedural-geometry";
import { useScreenTexture } from "./ScreenTexture";
import type { Device } from "../../types/scene";
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
  const params = device.proceduralParams;

  // Fallback for devices without procedural params
  if (!params) return null;

  const geo = useMemo(() => createProceduralGeometry(params), [params]);

  const screenTexture = useScreenTexture({
    screenWidth: params.screenWidth,
    screenHeight: params.screenHeight,
    screenContent: device.screenContent,
    layers: device.layers,
    currentTime,
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

  return (
    <group
      position={device.position}
      rotation={device.rotation.map((r) => (r * Math.PI) / 180) as [number, number, number]}
      scale={device.scale}
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
      <mesh position={[0, 0, geo.bodyDepth + 0.001]}>
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
