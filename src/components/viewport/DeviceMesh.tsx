import { Suspense } from "react";
import type { Device } from "../../types/scene";
import ProceduralDevice from "./ProceduralDevice";
import GltfDevice from "./GltfDevice";

// Models that have GLTF files available
const GLTF_MODELS = new Set(["iphone-15-pro", "ipad-pro-3d", "tablet-3d"]);

interface DeviceMeshProps {
  device: Device;
}

export default function DeviceMesh({ device }: DeviceMeshProps) {
  const useGltf = device.model && GLTF_MODELS.has(device.model);

  if (useGltf) {
    return (
      <Suspense fallback={<ProceduralDevice device={device} />}>
        <GltfDevice device={device} />
      </Suspense>
    );
  }

  return <ProceduralDevice device={device} />;
}
