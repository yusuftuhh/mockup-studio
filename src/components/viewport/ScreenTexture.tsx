import { useMemo, useEffect } from "react";
import * as THREE from "three";
import type { Layer, ScreenContent } from "../../types/scene";
import { drawGizmo } from "./ScreenGizmo";
import type { Vec2 } from "../../types/scene";

interface UseScreenTextureOptions {
  screenWidth: number;
  screenHeight: number;
  screenContent: ScreenContent | null;
  layers: Layer[];
  currentTime: number;
  selectedLayer?: Layer | null;
  hoveredHandle?: string | null;
}

// Pixel resolution multiplier for the offscreen canvas
const RESOLUTION = 2;

function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  canvasWidth: number,
  canvasHeight: number
): void {
  switch (layer.type) {
    case "spotlight": {
      const { center, radius, shape, dimOpacity, feather } = layer.properties;
      // Dim everything
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${dimOpacity})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      // Cut out the spotlight area
      ctx.globalCompositeOperation = "destination-out";
      if (shape === "circle") {
        const gradient = ctx.createRadialGradient(
          center[0],
          center[1],
          radius * (1 - feather),
          center[0],
          center[1],
          radius
        );
        gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center[0], center[1], radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillRect(
          center[0] - radius,
          center[1] - radius,
          radius * 2,
          radius * 2
        );
      }
      ctx.restore();
      break;
    }

    case "text": {
      const { text, position, fontSize, color, backgroundColor, fontFamily, shadow } =
        layer.properties;
      ctx.save();
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "top";

      if (shadow) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      if (backgroundColor) {
        const metrics = ctx.measureText(text);
        const pad = 6;
        ctx.fillStyle = backgroundColor;
        const textHeight = fontSize * 1.2;
        ctx.beginPath();
        const rx = position[0] - pad;
        const ry = position[1] - pad;
        const rw = metrics.width + pad * 2;
        const rh = textHeight + pad * 2;
        const cr = 4;
        ctx.moveTo(rx + cr, ry);
        ctx.lineTo(rx + rw - cr, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + cr);
        ctx.lineTo(rx + rw, ry + rh - cr);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - cr, ry + rh);
        ctx.lineTo(rx + cr, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - cr);
        ctx.lineTo(rx, ry + cr);
        ctx.quadraticCurveTo(rx, ry, rx + cr, ry);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.fillText(text, position[0], position[1]);
      ctx.restore();
      break;
    }

    case "arrow": {
      const { from, to, color, thickness, headSize, style } = layer.properties;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = thickness;

      if (style === "dashed") {
        ctx.setLineDash([8, 4]);
      }

      // Draw line
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();

      // Draw arrowhead
      const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
      ctx.beginPath();
      ctx.moveTo(to[0], to[1]);
      ctx.lineTo(
        to[0] - headSize * Math.cos(angle - Math.PI / 6),
        to[1] - headSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        to[0] - headSize * Math.cos(angle + Math.PI / 6),
        to[1] - headSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }

    case "blur": {
      const { region, strength } = layer.properties;
      ctx.save();
      ctx.filter = `blur(${strength}px)`;
      // Re-draw the region onto itself with blur
      try {
        const imgData = ctx.getImageData(
          region.x,
          region.y,
          region.width,
          region.height
        );
        ctx.putImageData(imgData, region.x, region.y);
        // Apply blur by drawing the region
        ctx.drawImage(
          ctx.canvas,
          region.x,
          region.y,
          region.width,
          region.height,
          region.x,
          region.y,
          region.width,
          region.height
        );
      } catch {
        // Fallback: just draw a semi-transparent overlay
        ctx.fillStyle = "rgba(128, 128, 128, 0.3)";
        ctx.fillRect(region.x, region.y, region.width, region.height);
      }
      ctx.filter = "none";
      ctx.restore();
      break;
    }

    case "shape": {
      const { shapeType, position, size, color, opacity, strokeWidth, filled } =
        layer.properties;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = strokeWidth;

      if (shapeType === "rect") {
        if (filled) {
          ctx.fillRect(position[0], position[1], size[0], size[1]);
        } else {
          ctx.strokeRect(position[0], position[1], size[0], size[1]);
        }
      } else if (shapeType === "circle") {
        const rx = size[0] / 2;
        const ry = size[1] / 2;
        ctx.beginPath();
        ctx.ellipse(
          position[0] + rx,
          position[1] + ry,
          rx,
          ry,
          0,
          0,
          Math.PI * 2
        );
        if (filled) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
      } else if (shapeType === "line") {
        ctx.beginPath();
        ctx.moveTo(position[0], position[1]);
        ctx.lineTo(position[0] + size[0], position[1] + size[1]);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case "tap": {
      const { position, rippleColor, rippleSize } = layer.properties;
      ctx.save();
      // Outer ripple
      ctx.strokeStyle = rippleColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(position[0], position[1], rippleSize, 0, Math.PI * 2);
      ctx.stroke();
      // Inner circle
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = rippleColor;
      ctx.beginPath();
      ctx.arc(position[0], position[1], rippleSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }

    case "callout": {
      const { position, targetPosition, label, color, fontSize } =
        layer.properties;
      ctx.save();
      // Connector line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(targetPosition[0], targetPosition[1]);
      ctx.lineTo(position[0], position[1]);
      ctx.stroke();

      // Badge circle
      const badgeRadius = Math.max(fontSize * 1.2, 16);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(position[0], position[1], badgeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, position[0], position[1]);
      ctx.restore();
      break;
    }

    default:
      // zoom, region_replace, cursor — not drawn on 2D canvas
      break;
  }
}

/**
 * Hook that creates and updates an offscreen canvas texture
 * for rendering screen content and layers onto a 3D device mesh.
 */
export function useScreenTexture({
  screenWidth,
  screenHeight,
  screenContent,
  layers,
  currentTime,
  selectedLayer = null,
  hoveredHandle = null,
}: UseScreenTextureOptions): THREE.CanvasTexture {
  const canvasWidth = Math.max(1, Math.round(screenWidth * RESOLUTION));
  const canvasHeight = Math.max(1, Math.round(screenHeight * RESOLUTION));

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = canvasWidth;
    c.height = canvasHeight;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return { canvas: c, texture: tex };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw base content
    if (screenContent && screenContent.type === "image" && screenContent.source) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        // Draw layers on top of image
        drawVisibleLayers(ctx, layers, currentTime, canvasWidth, canvasHeight);
        // Draw gizmo
        if (selectedLayer) {
          drawGizmo(ctx, selectedLayer, canvasWidth, canvasHeight, hoveredHandle as any);
        }
        texture.needsUpdate = true;
      };
      img.src = screenContent.source;
    } else {
      // Default screen with subtle gradient + branding
      const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      grad.addColorStop(0, "#1e1e3e");
      grad.addColorStop(1, "#0e0e2e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw "MockupStudio" watermark so user can verify texture is applied
      ctx.save();
      ctx.fillStyle = "rgba(124, 124, 255, 0.15)";
      const wmSize = Math.round(canvasWidth * 0.04);
      ctx.font = `bold ${wmSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("MockupStudio", canvasWidth / 2, canvasHeight / 2);
      ctx.restore();

      // Draw layers
      drawVisibleLayers(ctx, layers, currentTime, canvasWidth, canvasHeight);

      // Draw gizmo for selected layer
      if (selectedLayer) {
        drawGizmo(ctx, selectedLayer, canvasWidth, canvasHeight, hoveredHandle as any);
      }

      texture.needsUpdate = true;
    }
  }, [canvas, canvasWidth, canvasHeight, screenContent, layers, currentTime, texture, selectedLayer, hoveredHandle]);

  return texture;
}

function drawVisibleLayers(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  for (const layer of layers) {
    if (!layer.visible) continue;
    const [start, end] = layer.timeRange;
    if (currentTime < start || currentTime > end) continue;
    drawLayer(ctx, layer, canvasWidth, canvasHeight);
  }
}
