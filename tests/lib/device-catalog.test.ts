import { describe, it, expect } from "vitest";
import {
  getDeviceByModel,
  getAllDevices,
} from "../../src/lib/device-catalog";

describe("device-catalog", () => {
  it("finds iPad Air by model", () => {
    const entry = getDeviceByModel("ipad-air");
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("iPad Air");
    expect(entry!.category).toBe("tablet");
  });

  it("finds iPhone 16 Pro by model", () => {
    const entry = getDeviceByModel("iphone-16-pro");
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("iPhone 16 Pro");
    expect(entry!.category).toBe("phone");
  });

  it("finds MacBook Pro 16 by model", () => {
    const entry = getDeviceByModel("macbook-pro-16");
    expect(entry).toBeDefined();
    expect(entry!.name).toContain("MacBook");
    expect(entry!.category).toBe("laptop");
  });

  it("returns undefined for unknown model", () => {
    const entry = getDeviceByModel("nokia-3310");
    expect(entry).toBeUndefined();
  });

  it("has at least 10 devices", () => {
    const all = getAllDevices();
    expect(all.length).toBeGreaterThanOrEqual(10);
  });

  it("all entries have required fields", () => {
    const all = getAllDevices();
    for (const entry of all) {
      expect(entry.model).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(["phone", "tablet", "laptop", "desktop", "watch"]).toContain(
        entry.category
      );
      expect(entry.proceduralParams).toBeDefined();
      expect(entry.proceduralParams.width).toBeGreaterThan(0);
      expect(entry.proceduralParams.height).toBeGreaterThan(0);
      expect(entry.proceduralParams.screenWidth).toBeGreaterThan(0);
      expect(entry.proceduralParams.screenHeight).toBeGreaterThan(0);
      expect(entry.proceduralParams.thickness).toBeGreaterThan(0);
    }
  });

  it("has entries from all major categories", () => {
    const all = getAllDevices();
    const categories = new Set(all.map((e) => e.category));
    expect(categories.has("phone")).toBe(true);
    expect(categories.has("tablet")).toBe(true);
    expect(categories.has("laptop")).toBe(true);
    expect(categories.has("watch")).toBe(true);
  });

  it("gltfPath is null for all entries (for now)", () => {
    const all = getAllDevices();
    for (const entry of all) {
      expect(entry.gltfPath).toBeNull();
    }
  });

  it("screen dimensions fit within body dimensions", () => {
    const all = getAllDevices();
    for (const entry of all) {
      const p = entry.proceduralParams;
      expect(p.screenWidth).toBeLessThanOrEqual(p.width);
      expect(p.screenHeight).toBeLessThanOrEqual(p.height);
    }
  });
});
