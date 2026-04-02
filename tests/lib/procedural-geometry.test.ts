import { describe, it, expect } from "vitest";
import { createProceduralGeometry } from "../../src/lib/procedural-geometry";
import type { ProceduralParams } from "../../src/types/scene";

const SCALE = 0.01;

const baseParams: ProceduralParams = {
  width: 72.0,
  height: 150.0,
  screenWidth: 68.0,
  screenHeight: 144.0,
  bezelTop: 3.0,
  bezelBottom: 3.0,
  bezelSide: 2.0,
  cornerRadius: 10,
  thickness: 8.0,
  color: "#1c1c1e",
  material: "matte",
};

describe("createProceduralGeometry", () => {
  it("computes dimensions in scene units", () => {
    const result = createProceduralGeometry(baseParams);

    expect(result.bodyWidth).toBeCloseTo(72.0 * SCALE, 6);
    expect(result.bodyHeight).toBeCloseTo(150.0 * SCALE, 6);
    expect(result.bodyDepth).toBeCloseTo(8.0 * SCALE, 6);
    expect(result.screenWidth).toBeCloseTo(68.0 * SCALE, 6);
    expect(result.screenHeight).toBeCloseTo(144.0 * SCALE, 6);
  });

  it("computes screen offset (centered horizontally)", () => {
    const result = createProceduralGeometry(baseParams);

    // (72 - 68) / 2 * SCALE = 0.02
    const expectedOffsetX = (baseParams.width - baseParams.screenWidth) / 2 * SCALE;
    expect(result.screenOffsetX).toBeCloseTo(expectedOffsetX, 6);
  });

  it("computes vertical screen offset based on bezel", () => {
    const result = createProceduralGeometry(baseParams);
    expect(result.screenOffsetY).toBeCloseTo(baseParams.bezelTop * SCALE, 6);
  });

  it("handles asymmetric bezels", () => {
    const asymmetric: ProceduralParams = {
      ...baseParams,
      bezelTop: 10.0,
      bezelBottom: 20.0,
    };

    const result = createProceduralGeometry(asymmetric);
    expect(result.screenOffsetY).toBeCloseTo(10.0 * SCALE, 6);
  });

  it("applies corner radius in scene units", () => {
    const result = createProceduralGeometry(baseParams);
    expect(result.cornerRadius).toBeCloseTo(10 * SCALE, 6);
  });

  it("passes through color and material", () => {
    const result = createProceduralGeometry(baseParams);
    expect(result.color).toBe("#1c1c1e");
    expect(result.material).toBe("matte");
  });

  it("handles zero bezels", () => {
    const zeroBezels: ProceduralParams = {
      ...baseParams,
      bezelTop: 0,
      bezelBottom: 0,
      bezelSide: 0,
      screenWidth: 72.0,
      screenHeight: 150.0,
    };

    const result = createProceduralGeometry(zeroBezels);
    expect(result.screenOffsetX).toBeCloseTo(0, 6);
    expect(result.screenOffsetY).toBeCloseTo(0, 6);
    expect(result.screenWidth).toBeCloseTo(result.bodyWidth, 6);
    expect(result.screenHeight).toBeCloseTo(result.bodyHeight, 6);
  });

  it("handles different materials", () => {
    const glossy = createProceduralGeometry({ ...baseParams, material: "glossy" });
    const metallic = createProceduralGeometry({ ...baseParams, material: "metallic" });

    expect(glossy.material).toBe("glossy");
    expect(metallic.material).toBe("metallic");
  });
});
