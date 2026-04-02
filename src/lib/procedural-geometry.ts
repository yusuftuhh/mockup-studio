import type { ProceduralParams, MaterialType } from "../types/scene";

/** Scale factor: mm to scene units (1 scene unit = 100mm) */
const SCALE = 0.01;

export interface ProceduralGeometryResult {
  bodyWidth: number;
  bodyHeight: number;
  bodyDepth: number;
  screenWidth: number;
  screenHeight: number;
  screenOffsetX: number;
  screenOffsetY: number;
  cornerRadius: number;
  color: string;
  material: MaterialType;
}

/**
 * Compute procedural device geometry from device parameters.
 * All output dimensions are in scene units (param values * SCALE).
 *
 * Screen is centered horizontally; vertically offset if top/bottom bezels
 * differ.
 */
export function createProceduralGeometry(
  params: ProceduralParams
): ProceduralGeometryResult {
  const bodyWidth = params.width * SCALE;
  const bodyHeight = params.height * SCALE;
  const bodyDepth = params.thickness * SCALE;

  const screenWidth = params.screenWidth * SCALE;
  const screenHeight = params.screenHeight * SCALE;

  // Horizontal: center the screen in the body
  const screenOffsetX = (bodyWidth - screenWidth) / 2;

  // Vertical: shifted if bezels differ
  // offsetY = bezelTop * SCALE (from the top of the body)
  const screenOffsetY = params.bezelTop * SCALE;

  const cornerRadius = params.cornerRadius * SCALE;

  return {
    bodyWidth,
    bodyHeight,
    bodyDepth,
    screenWidth,
    screenHeight,
    screenOffsetX,
    screenOffsetY,
    cornerRadius,
    color: params.color,
    material: params.material,
  };
}
