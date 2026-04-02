import { describe, it, expect } from "vitest";
import {
  interpolateValue,
  interpolateKeyframes,
} from "../../src/engine/interpolator";
import type { Keyframe } from "../../src/types/scene";

describe("interpolateValue", () => {
  it("linear interpolation at midpoint", () => {
    expect(interpolateValue(0, 100, 0.5, "linear")).toBe(50);
  });

  it("linear interpolation at boundaries", () => {
    expect(interpolateValue(0, 100, 0, "linear")).toBe(0);
    expect(interpolateValue(0, 100, 1, "linear")).toBe(100);
  });

  it("ease-in starts slow", () => {
    const val = interpolateValue(0, 100, 0.5, "ease-in");
    // ease-in at 0.5 = 0.25 => value = 25
    expect(val).toBe(25);
  });

  it("ease-out ends slow", () => {
    const val = interpolateValue(0, 100, 0.5, "ease-out");
    // ease-out at 0.5 = 0.75 => value = 75
    expect(val).toBe(75);
  });

  it("ease-in-out curve shape", () => {
    const quarter = interpolateValue(0, 1, 0.25, "ease-in-out");
    const mid = interpolateValue(0, 1, 0.5, "ease-in-out");
    const threeQuarter = interpolateValue(0, 1, 0.75, "ease-in-out");

    // Symmetric: quarter + threeQuarter should sum to 1
    expect(quarter + threeQuarter).toBeCloseTo(1, 5);
    // Midpoint should be 0.5
    expect(mid).toBeCloseTo(0.5, 5);
    // First half is slower than linear
    expect(quarter).toBeLessThan(0.25);
  });

  it("step returns 0 before 1, and 1 at 1", () => {
    expect(interpolateValue(0, 100, 0, "step")).toBe(0);
    expect(interpolateValue(0, 100, 0.5, "step")).toBe(0);
    expect(interpolateValue(0, 100, 0.99, "step")).toBe(0);
    expect(interpolateValue(0, 100, 1, "step")).toBe(100);
  });

  it("spring overshoots slightly", () => {
    // Spring should reach 1 at t=1
    const atEnd = interpolateValue(0, 1, 1, "spring");
    expect(atEnd).toBeCloseTo(1, 5);
  });

  it("bounce reaches 1 at t=1", () => {
    const atEnd = interpolateValue(0, 100, 1, "bounce");
    expect(atEnd).toBeCloseTo(100, 5);
  });

  it("clamps t to [0,1]", () => {
    expect(interpolateValue(0, 100, -0.5, "linear")).toBe(0);
    expect(interpolateValue(0, 100, 1.5, "linear")).toBe(100);
  });
});

describe("interpolateKeyframes", () => {
  const keyframes: Keyframe[] = [
    { id: "k1", property: "opacity", time: 0, value: 0, easing: "linear" },
    { id: "k2", property: "opacity", time: 2, value: 1, easing: "linear" },
    { id: "k3", property: "opacity", time: 5, value: 0.5, easing: "linear" },
    { id: "k4", property: "posX", time: 0, value: 10, easing: "linear" },
    { id: "k5", property: "posX", time: 4, value: 50, easing: "linear" },
  ];

  it("returns value at exact keyframe time", () => {
    expect(interpolateKeyframes(keyframes, "opacity", 0)).toBe(0);
    expect(interpolateKeyframes(keyframes, "opacity", 2)).toBe(1);
    expect(interpolateKeyframes(keyframes, "opacity", 5)).toBe(0.5);
  });

  it("interpolates midpoint between keyframes", () => {
    // Between t=0 (v=0) and t=2 (v=1) at t=1 => 0.5
    expect(interpolateKeyframes(keyframes, "opacity", 1)).toBeCloseTo(0.5, 5);
  });

  it("holds value before first keyframe", () => {
    expect(interpolateKeyframes(keyframes, "opacity", -1)).toBe(0);
  });

  it("holds value after last keyframe", () => {
    expect(interpolateKeyframes(keyframes, "opacity", 10)).toBe(0.5);
  });

  it("returns 0 for missing property", () => {
    expect(interpolateKeyframes(keyframes, "nonexistent", 1)).toBe(0);
  });

  it("handles different properties independently", () => {
    // posX at t=2: between t=0(10) and t=4(50) => 30
    expect(interpolateKeyframes(keyframes, "posX", 2)).toBeCloseTo(30, 5);
  });

  it("handles empty keyframes array", () => {
    expect(interpolateKeyframes([], "anything", 5)).toBe(0);
  });

  it("handles single keyframe", () => {
    const single: Keyframe[] = [
      { id: "s1", property: "scale", time: 3, value: 2, easing: "linear" },
    ];
    expect(interpolateKeyframes(single, "scale", 0)).toBe(2);
    expect(interpolateKeyframes(single, "scale", 3)).toBe(2);
    expect(interpolateKeyframes(single, "scale", 10)).toBe(2);
  });
});
