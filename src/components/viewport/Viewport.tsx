import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { useSceneStore } from "../../stores/scene-store";
import DeviceMesh from "./DeviceMesh";

export default function Viewport() {
  const devices = useSceneStore((s) => s.scene.devices);
  const env = useSceneStore((s) => s.scene.environment);
  const bgColor = useSceneStore((s) => s.scene.canvas.backgroundColor);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50, near: 0.01, far: 1000 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        style={{ background: bgColor }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />

        {env.type !== "none" && (
          <Environment
            preset={env.type as "studio" | "sunset" | "dawn" | "night"}
            environmentIntensity={env.intensity}
          />
        )}

        <Grid
          position={[0, -2, 0]}
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#2a2a4a"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#3a3a5a"
          fadeDistance={15}
          fadeStrength={1}
          infiniteGrid
        />

        {devices.map((device) => (
          <DeviceMesh key={device.id} device={device} />
        ))}

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={0.1}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}
