import { useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useSceneStore } from "../../stores/scene-store";
import type { Layer, Vec2 } from "../../types/scene";

// Shared flag to disable orbit controls during gizmo drag
let orbitEnabled = true;
export function isOrbitEnabled() { return orbitEnabled; }

interface ScreenGizmoProps {
  screenMeshRef: React.RefObject<THREE.Mesh | null>;
  canvasWidth: number;
  canvasHeight: number;
  deviceId: string;
}

type DragMode = "move" | "move-x" | "move-y" | "rotate" | null;

/**
 * Handles raycasting onto the device screen mesh,
 * draws gizmo handles on the ScreenTexture canvas,
 * and processes drag events for moving/rotating layers.
 */
export function useScreenGizmo({
  screenMeshRef,
  canvasWidth,
  canvasHeight,
  deviceId,
}: ScreenGizmoProps) {
  const { gl, camera, raycaster } = useThree();
  const [hoveredHandle, setHoveredHandle] = useState<DragMode>(null);
  const dragRef = useRef<{
    mode: DragMode;
    layerId: string;
    startUV: Vec2;
    startPos: Vec2;
    startAngle?: number;
  } | null>(null);

  const selectedLayerId = useSceneStore((s) => s.editor.selectedLayerId);
  const devices = useSceneStore((s) => s.scene.devices);
  const device = devices.find((d) => d.id === deviceId);
  const selectedLayer = device?.layers.find((l) => l.id === selectedLayerId);

  // Convert mouse event to UV coordinates on the screen mesh
  const getScreenUV = useCallback(
    (e: MouseEvent): Vec2 | null => {
      const mesh = screenMeshRef.current;
      if (!mesh) return null;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(mesh);
      if (hits.length === 0 || !hits[0].uv) return null;

      return [
        hits[0].uv.x * canvasWidth,
        (1 - hits[0].uv.y) * canvasHeight, // flip Y
      ];
    },
    [screenMeshRef, gl, camera, raycaster, canvasWidth, canvasHeight]
  );

  // Get the "position" of a layer (center point for the gizmo)
  const getLayerCenter = useCallback(
    (layer: Layer): Vec2 | null => {
      const props = layer.properties as Record<string, unknown>;
      if (props.center) return props.center as Vec2;
      if (props.position) return props.position as Vec2;
      if (props.from && props.to) {
        const from = props.from as Vec2;
        const to = props.to as Vec2;
        return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
      }
      return null;
    },
    []
  );

  // Check which handle the mouse is over
  const getHandleAtUV = useCallback(
    (uv: Vec2): DragMode => {
      if (!selectedLayer) return null;
      const center = getLayerCenter(selectedLayer);
      if (!center) return null;

      const dx = uv[0] - center[0];
      const dy = uv[1] - center[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      const handleSize = canvasWidth * 0.02;
      const axisLen = canvasWidth * 0.08;

      // X axis handle (right of center)
      if (
        Math.abs(uv[0] - (center[0] + axisLen)) < handleSize * 1.5 &&
        Math.abs(uv[1] - center[1]) < handleSize * 1.5
      ) {
        return "move-x";
      }

      // Y axis handle (below center)
      if (
        Math.abs(uv[0] - center[0]) < handleSize * 1.5 &&
        Math.abs(uv[1] - (center[1] + axisLen)) < handleSize * 1.5
      ) {
        return "move-y";
      }

      // Rotation ring
      const ringRadius = canvasWidth * 0.06;
      if (Math.abs(dist - ringRadius) < handleSize * 2) {
        return "rotate";
      }

      // Center move handle
      if (dist < handleSize * 2) {
        return "move";
      }

      return null;
    },
    [selectedLayer, getLayerCenter, canvasWidth]
  );

  // Mouse handlers
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      const uv = getScreenUV(e);
      if (!uv || !selectedLayer) return;

      const handle = getHandleAtUV(uv);
      if (!handle) return;

      e.stopPropagation();
      const center = getLayerCenter(selectedLayer);
      if (!center) return;

      dragRef.current = {
        mode: handle,
        layerId: selectedLayer.id,
        startUV: uv,
        startPos: [...center] as Vec2,
        startAngle: handle === "rotate" ? Math.atan2(uv[1] - center[1], uv[0] - center[0]) : undefined,
      };

      orbitEnabled = false;
      canvas.style.cursor = handle === "rotate" ? "grab" : "move";
    };

    const onPointerMove = (e: PointerEvent) => {
      const uv = getScreenUV(e);
      if (!uv) {
        setHoveredHandle(null);
        return;
      }

      // Dragging
      if (dragRef.current && device) {
        const { mode, layerId, startUV, startPos } = dragRef.current;
        const deltaX = uv[0] - startUV[0];
        const deltaY = uv[1] - startUV[1];

        let newPos: Vec2;
        switch (mode) {
          case "move":
            newPos = [startPos[0] + deltaX, startPos[1] + deltaY];
            break;
          case "move-x":
            newPos = [startPos[0] + deltaX, startPos[1]];
            break;
          case "move-y":
            newPos = [startPos[0], startPos[1] + deltaY];
            break;
          default:
            return;
        }

        // Update the layer's position property
        const layer = device.layers.find((l) => l.id === layerId);
        if (!layer) return;

        const props = layer.properties as Record<string, unknown>;
        const updates: Record<string, unknown> = { ...props };

        if (props.center) {
          updates.center = newPos;
        } else if (props.position) {
          updates.position = newPos;
        } else if (props.from && props.to) {
          const from = props.from as Vec2;
          const to = props.to as Vec2;
          const midX = (from[0] + to[0]) / 2;
          const midY = (from[1] + to[1]) / 2;
          const offX = newPos[0] - midX;
          const offY = newPos[1] - midY;
          updates.from = [from[0] + offX, from[1] + offY];
          updates.to = [to[0] + offX, to[1] + offY];
        }

        useSceneStore.getState().updateLayer(device.id, layerId, {
          properties: updates,
        } as Partial<Layer>);

        return;
      }

      // Hovering
      const handle = getHandleAtUV(uv);
      setHoveredHandle(handle);
      if (handle) {
        canvas.style.cursor =
          handle === "rotate" ? "grab" :
          handle === "move-x" ? "ew-resize" :
          handle === "move-y" ? "ns-resize" :
          "move";
      } else {
        canvas.style.cursor = "";
      }
    };

    const onPointerUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        orbitEnabled = true;
        canvas.style.cursor = "";
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl, selectedLayer, device, getScreenUV, getHandleAtUV, getLayerCenter]);

  return { hoveredHandle, isDragging: dragRef.current !== null };
}

/**
 * Draw Spline-style gizmo handles on the CanvasTexture context.
 * Call this after drawing all layers.
 */
export function drawGizmo(
  ctx: CanvasRenderingContext2D,
  layer: Layer | null,
  canvasWidth: number,
  canvasHeight: number,
  hoveredHandle: DragMode
): void {
  if (!layer) return;

  const props = layer.properties as Record<string, unknown>;
  let center: Vec2 | null = null;

  if (props.center) center = props.center as Vec2;
  else if (props.position) center = props.position as Vec2;
  else if (props.from && props.to) {
    const from = props.from as Vec2;
    const to = props.to as Vec2;
    center = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  }

  if (!center) return;

  const axisLen = canvasWidth * 0.08;
  const handleSize = canvasWidth * 0.012;
  const ringRadius = canvasWidth * 0.06;

  ctx.save();

  // ── Rotation Ring ──
  ctx.strokeStyle = hoveredHandle === "rotate"
    ? "rgba(160, 120, 255, 0.9)"
    : "rgba(124, 124, 255, 0.35)";
  ctx.lineWidth = hoveredHandle === "rotate" ? 3 : 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(center[0], center[1], ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── X Axis (red) ──
  const xEnd: Vec2 = [center[0] + axisLen, center[1]];
  ctx.strokeStyle = hoveredHandle === "move-x"
    ? "rgba(255, 100, 100, 1)"
    : "rgba(248, 113, 113, 0.8)";
  ctx.lineWidth = hoveredHandle === "move-x" ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(xEnd[0], xEnd[1]);
  ctx.stroke();

  // X axis arrowhead
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(xEnd[0] + handleSize, xEnd[1]);
  ctx.lineTo(xEnd[0] - handleSize * 0.5, xEnd[1] - handleSize * 0.6);
  ctx.lineTo(xEnd[0] - handleSize * 0.5, xEnd[1] + handleSize * 0.6);
  ctx.closePath();
  ctx.fill();

  // X handle circle
  ctx.beginPath();
  ctx.arc(xEnd[0], xEnd[1], handleSize, 0, Math.PI * 2);
  ctx.fill();

  // ── Y Axis (green) ──
  const yEnd: Vec2 = [center[0], center[1] + axisLen];
  ctx.strokeStyle = hoveredHandle === "move-y"
    ? "rgba(100, 255, 100, 1)"
    : "rgba(74, 222, 128, 0.8)";
  ctx.lineWidth = hoveredHandle === "move-y" ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(center[0], center[1]);
  ctx.lineTo(yEnd[0], yEnd[1]);
  ctx.stroke();

  // Y axis arrowhead
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(yEnd[0], yEnd[1] + handleSize);
  ctx.lineTo(yEnd[0] - handleSize * 0.6, yEnd[1] - handleSize * 0.5);
  ctx.lineTo(yEnd[0] + handleSize * 0.6, yEnd[1] - handleSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // Y handle circle
  ctx.beginPath();
  ctx.arc(yEnd[0], yEnd[1], handleSize, 0, Math.PI * 2);
  ctx.fill();

  // ── Center Handle (blue/white) ──
  ctx.fillStyle = hoveredHandle === "move"
    ? "rgba(160, 160, 255, 1)"
    : "rgba(124, 124, 255, 0.9)";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center[0], center[1], handleSize * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner dot
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(center[0], center[1], handleSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── Label ──
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = `${Math.round(canvasWidth * 0.012)}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    `${layer.name} (${Math.round(center[0])}, ${Math.round(center[1])})`,
    center[0] + handleSize * 2,
    center[1] - handleSize * 2
  );

  ctx.restore();
}
