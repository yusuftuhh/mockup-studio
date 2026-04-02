import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, ContactShadows } from "@react-three/drei";
import { useSceneStore } from "../../stores/scene-store";
import DeviceMesh from "./DeviceMesh";

// Separate component to force camera near plane inside Canvas
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.near = 0.005;
    camera.far = 1000;
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export default function Viewport() {
  const devices = useSceneStore((s) => s.scene.devices);
  const env = useSceneStore((s) => s.scene.environment);
  const bgColor = useSceneStore((s) => s.scene.canvas.backgroundColor);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 45, near: 0.005, far: 1000 }}
        gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: 3 }}
        style={{ background: bgColor }}
      >
        <CameraSetup />

        {/* Softer, more balanced lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 5]} intensity={1.0} castShadow />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} />

        {env.type !== "none" && (
          <Environment
            preset={env.type as "studio" | "sunset" | "dawn" | "night"}
            environmentIntensity={0.4}
          />
        )}

        {/* Subtle contact shadows under devices */}
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.3}
          scale={10}
          blur={2}
          far={4}
        />

        <Grid
          position={[0, -1.5, 0]}
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
          dampingFactor={0.08}
          minDistance={0.05}
          maxDistance={50}
          rotateSpeed={0.8}
          zoomSpeed={1.2}
          panSpeed={0.8}
        />
      </Canvas>
    </div>
  );
}
