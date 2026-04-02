import type { Device } from "../../types/scene";
import ProceduralDevice from "./ProceduralDevice";

interface DeviceMeshProps {
  device: Device;
}

export default function DeviceMesh({ device }: DeviceMeshProps) {
  return <ProceduralDevice device={device} />;
}
