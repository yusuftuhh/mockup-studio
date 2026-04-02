import type { ProceduralParams } from "../types/scene";

export type DeviceCategory = "phone" | "tablet" | "laptop" | "desktop" | "watch";

export interface CatalogEntry {
  model: string;
  name: string;
  category: DeviceCategory;
  gltfPath: string | null;
  proceduralParams: ProceduralParams;
}

// All dimensions in mm
const catalog: CatalogEntry[] = [
  // ── 3D Models (GLTF) ──────────────────────────────────────────────────
  {
    model: "iphone-15-pro",
    name: "iPhone 15 Pro (3D)",
    category: "phone",
    gltfPath: "/models/iphone-15-pro.glb",
    proceduralParams: {
      width: 70.6,
      height: 146.6,
      screenWidth: 66.6,
      screenHeight: 140.6,
      bezelTop: 3.0,
      bezelBottom: 3.0,
      bezelSide: 2.0,
      cornerRadius: 10,
      thickness: 8.25,
      color: "#1c1c1e",
      material: "metallic",
    },
  },
  {
    model: "tablet-3d",
    name: "Tablet (3D)",
    category: "tablet",
    gltfPath: "/models/tablet.glb",
    proceduralParams: {
      width: 178.5,
      height: 247.6,
      screenWidth: 162.5,
      screenHeight: 231.6,
      bezelTop: 8,
      bezelBottom: 8,
      bezelSide: 8,
      cornerRadius: 12,
      thickness: 6.1,
      color: "#2e2e30",
      material: "metallic",
    },
  },

  // ── Phones ──────────────────────────────────────────────────────────────

  {
    model: "iphone-16-pro",
    name: "iPhone 16 Pro",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 71.5,
      height: 149.6,
      screenWidth: 67.5,
      screenHeight: 143.6,
      bezelTop: 3.0,
      bezelBottom: 3.0,
      bezelSide: 2.0,
      cornerRadius: 10,
      thickness: 8.25,
      color: "#1c1c1e",
      material: "metallic",
    },
  },
  {
    model: "iphone-16-pro-max",
    name: "iPhone 16 Pro Max",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 77.6,
      height: 163.0,
      screenWidth: 73.6,
      screenHeight: 157.0,
      bezelTop: 3.0,
      bezelBottom: 3.0,
      bezelSide: 2.0,
      cornerRadius: 11,
      thickness: 8.25,
      color: "#1c1c1e",
      material: "metallic",
    },
  },
  {
    model: "iphone-15",
    name: "iPhone 15",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 71.6,
      height: 147.6,
      screenWidth: 67.0,
      screenHeight: 141.0,
      bezelTop: 3.3,
      bezelBottom: 3.3,
      bezelSide: 2.3,
      cornerRadius: 10,
      thickness: 7.8,
      color: "#1c1c1e",
      material: "glossy",
    },
  },
  {
    model: "samsung-galaxy-s24",
    name: "Samsung Galaxy S24",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 70.6,
      height: 147.0,
      screenWidth: 66.6,
      screenHeight: 141.0,
      bezelTop: 3.0,
      bezelBottom: 3.0,
      bezelSide: 2.0,
      cornerRadius: 9,
      thickness: 7.6,
      color: "#2c2c2e",
      material: "metallic",
    },
  },
  {
    model: "google-pixel-9",
    name: "Google Pixel 9",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
      width: 72.0,
      height: 152.8,
      screenWidth: 68.0,
      screenHeight: 146.0,
      bezelTop: 3.4,
      bezelBottom: 3.4,
      bezelSide: 2.0,
      cornerRadius: 11,
      thickness: 8.5,
      color: "#202124",
      material: "matte",
    },
  },

  // ── Tablets ─────────────────────────────────────────────────────────────

  {
    model: "ipad-air",
    name: "iPad Air",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 178.5,
      height: 247.6,
      screenWidth: 170.0,
      screenHeight: 239.0,
      bezelTop: 4.3,
      bezelBottom: 4.3,
      bezelSide: 4.25,
      cornerRadius: 14,
      thickness: 6.1,
      color: "#2c2c2e",
      material: "metallic",
    },
  },
  {
    model: "ipad-pro-13",
    name: 'iPad Pro 13"',
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 215.5,
      height: 281.6,
      screenWidth: 207.0,
      screenHeight: 273.0,
      bezelTop: 4.3,
      bezelBottom: 4.3,
      bezelSide: 4.25,
      cornerRadius: 14,
      thickness: 5.1,
      color: "#1c1c1e",
      material: "metallic",
    },
  },
  {
    model: "lenovo-tab-k11",
    name: "Lenovo Tab K11",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 166.3,
      height: 244.0,
      screenWidth: 156.0,
      screenHeight: 234.0,
      bezelTop: 5.0,
      bezelBottom: 5.0,
      bezelSide: 5.15,
      cornerRadius: 10,
      thickness: 7.2,
      color: "#3a3a3c",
      material: "matte",
    },
  },
  {
    model: "samsung-galaxy-tab-s9",
    name: "Samsung Galaxy Tab S9",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 165.8,
      height: 254.3,
      screenWidth: 157.0,
      screenHeight: 245.0,
      bezelTop: 4.65,
      bezelBottom: 4.65,
      bezelSide: 4.4,
      cornerRadius: 10,
      thickness: 5.9,
      color: "#2c2c2e",
      material: "metallic",
    },
  },

  // ── Laptops ─────────────────────────────────────────────────────────────

  {
    model: "macbook-pro-16",
    name: 'MacBook Pro 16"',
    category: "laptop",
    gltfPath: null,
    proceduralParams: {
      width: 355.7,
      height: 248.1,
      screenWidth: 345.0,
      screenHeight: 222.0,
      bezelTop: 10.0,
      bezelBottom: 16.1,
      bezelSide: 5.35,
      cornerRadius: 8,
      thickness: 16.8,
      color: "#2c2c2e",
      material: "metallic",
    },
  },
  {
    model: "macbook-air-15",
    name: 'MacBook Air 15"',
    category: "laptop",
    gltfPath: null,
    proceduralParams: {
      width: 340.4,
      height: 237.6,
      screenWidth: 330.0,
      screenHeight: 214.0,
      bezelTop: 9.0,
      bezelBottom: 14.6,
      bezelSide: 5.2,
      cornerRadius: 8,
      thickness: 11.5,
      color: "#2c2c2e",
      material: "metallic",
    },
  },

  // ── Watches ─────────────────────────────────────────────────────────────

  {
    model: "apple-watch-series-10",
    name: "Apple Watch Series 10",
    category: "watch",
    gltfPath: null,
    proceduralParams: {
      width: 42.0,
      height: 46.0,
      screenWidth: 37.0,
      screenHeight: 41.0,
      bezelTop: 2.5,
      bezelBottom: 2.5,
      bezelSide: 2.5,
      cornerRadius: 14,
      thickness: 9.7,
      color: "#1c1c1e",
      material: "metallic",
    },
  },

  // ── Generic ─────────────────────────────────────────────────────────────

  {
    model: "generic-phone",
    name: "Generic Phone",
    category: "phone",
    gltfPath: null,
    proceduralParams: {
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
    },
  },
  {
    model: "generic-tablet",
    name: "Generic Tablet",
    category: "tablet",
    gltfPath: null,
    proceduralParams: {
      width: 180.0,
      height: 250.0,
      screenWidth: 172.0,
      screenHeight: 242.0,
      bezelTop: 4.0,
      bezelBottom: 4.0,
      bezelSide: 4.0,
      cornerRadius: 12,
      thickness: 6.5,
      color: "#2c2c2e",
      material: "matte",
    },
  },
];

/**
 * Returns all devices in the catalog.
 */
export function getAllDevices(): CatalogEntry[] {
  return [...catalog];
}

/**
 * Find a device by its model identifier.
 */
export function getDeviceByModel(model: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.model === model);
}
