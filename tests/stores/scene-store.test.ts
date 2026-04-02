import { describe, it, expect, beforeEach } from "vitest";
import { useSceneStore } from "../../src/stores/scene-store";
import type { Layer, TextLayer, ScreenContent } from "../../src/types/scene";

function getState() {
  return useSceneStore.getState();
}

describe("scene-store", () => {
  beforeEach(() => {
    getState().resetScene();
  });

  // ── Default scene ─────────────────────────────────────────────────────

  describe("default scene", () => {
    it("has correct canvas defaults", () => {
      const { scene } = getState();
      expect(scene.canvas.width).toBe(1920);
      expect(scene.canvas.height).toBe(1080);
      expect(scene.canvas.fps).toBe(60);
      expect(scene.canvas.duration).toBe(10);
    });

    it("starts with no devices", () => {
      expect(getState().scene.devices).toHaveLength(0);
    });

    it("has studio environment", () => {
      expect(getState().scene.environment.type).toBe("studio");
    });

    it("has default editor state", () => {
      const { editor } = getState();
      expect(editor.selectedDeviceId).toBeNull();
      expect(editor.selectedLayerId).toBeNull();
      expect(editor.currentTime).toBe(0);
      expect(editor.isPlaying).toBe(false);
    });
  });

  // ── Device operations ─────────────────────────────────────────────────

  describe("device operations", () => {
    it("adds a device", () => {
      const id = getState().addDevice({
        name: "Test Phone",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });

      expect(id).toContain("dev_");
      expect(getState().scene.devices).toHaveLength(1);
      expect(getState().scene.devices[0].name).toBe("Test Phone");
    });

    it("removes a device", () => {
      const id = getState().addDevice({
        name: "To Remove",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });

      getState().removeDevice(id);
      expect(getState().scene.devices).toHaveLength(0);
    });

    it("clears selection when removing selected device", () => {
      const id = getState().addDevice({
        name: "Selected",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });

      getState().selectDevice(id);
      expect(getState().editor.selectedDeviceId).toBe(id);

      getState().removeDevice(id);
      expect(getState().editor.selectedDeviceId).toBeNull();
    });

    it("updates a device", () => {
      const id = getState().addDevice({
        name: "Old Name",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });

      getState().updateDevice(id, { name: "New Name", position: [1, 2, 3] });
      const device = getState().scene.devices[0];
      expect(device.name).toBe("New Name");
      expect(device.position).toEqual([1, 2, 3]);
      expect(device.id).toBe(id); // id preserved
    });
  });

  // ── Screen content ────────────────────────────────────────────────────

  describe("screen content", () => {
    it("sets screen content on a device", () => {
      const id = getState().addDevice({
        name: "Phone",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });

      const content: ScreenContent = { type: "image", source: "test.png" };
      getState().setScreenContent(id, content);

      const device = getState().scene.devices[0];
      expect(device.screenContent).toEqual(content);
    });

    it("clears screen content", () => {
      const id = getState().addDevice({
        name: "Phone",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: { type: "image", source: "test.png" },
      });

      getState().setScreenContent(id, null);
      expect(getState().scene.devices[0].screenContent).toBeNull();
    });
  });

  // ── Layer operations ──────────────────────────────────────────────────

  describe("layer operations", () => {
    let deviceId: string;

    beforeEach(() => {
      deviceId = getState().addDevice({
        name: "Phone",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });
    });

    it("adds a layer to a device", () => {
      const layerId = getState().addLayer(deviceId, {
        type: "text",
        visible: true,
        locked: false,
        name: "Title",
        timeRange: [0, 5],
        animation: { entry: "fade", exit: "fade", easing: "ease-in-out" },
        keyframes: [],
        properties: {
          text: "Hello",
          position: [100, 100],
          fontSize: 24,
          color: "#ffffff",
          backgroundColor: null,
          fontFamily: "Inter",
          shadow: false,
        },
      } as Omit<TextLayer, "id">);

      expect(layerId).toContain("layer_");
      const device = getState().scene.devices[0];
      expect(device.layers).toHaveLength(1);
      expect(device.layers[0].name).toBe("Title");
    });

    it("removes a layer", () => {
      const layerId = getState().addLayer(deviceId, {
        type: "text",
        visible: true,
        locked: false,
        name: "To Remove",
        timeRange: [0, 5],
        animation: { entry: "none", exit: "none", easing: "linear" },
        keyframes: [],
        properties: {
          text: "Gone",
          position: [0, 0],
          fontSize: 16,
          color: "#fff",
          backgroundColor: null,
          fontFamily: "Inter",
          shadow: false,
        },
      } as Omit<TextLayer, "id">);

      getState().removeLayer(deviceId, layerId);
      expect(getState().scene.devices[0].layers).toHaveLength(0);
    });

    it("updates a layer", () => {
      const layerId = getState().addLayer(deviceId, {
        type: "text",
        visible: true,
        locked: false,
        name: "Old",
        timeRange: [0, 5],
        animation: { entry: "none", exit: "none", easing: "linear" },
        keyframes: [],
        properties: {
          text: "Old text",
          position: [0, 0],
          fontSize: 16,
          color: "#fff",
          backgroundColor: null,
          fontFamily: "Inter",
          shadow: false,
        },
      } as Omit<TextLayer, "id">);

      getState().updateLayer(deviceId, layerId, { name: "New", visible: false });
      const layer = getState().scene.devices[0].layers[0];
      expect(layer.name).toBe("New");
      expect(layer.visible).toBe(false);
    });

    it("reorders layers", () => {
      const id1 = getState().addLayer(deviceId, {
        type: "text",
        visible: true,
        locked: false,
        name: "First",
        timeRange: [0, 5],
        animation: { entry: "none", exit: "none", easing: "linear" },
        keyframes: [],
        properties: {
          text: "1",
          position: [0, 0],
          fontSize: 16,
          color: "#fff",
          backgroundColor: null,
          fontFamily: "Inter",
          shadow: false,
        },
      } as Omit<TextLayer, "id">);

      const id2 = getState().addLayer(deviceId, {
        type: "text",
        visible: true,
        locked: false,
        name: "Second",
        timeRange: [0, 5],
        animation: { entry: "none", exit: "none", easing: "linear" },
        keyframes: [],
        properties: {
          text: "2",
          position: [0, 0],
          fontSize: 16,
          color: "#fff",
          backgroundColor: null,
          fontFamily: "Inter",
          shadow: false,
        },
      } as Omit<TextLayer, "id">);

      getState().reorderLayers(deviceId, [id2, id1]);
      const layers = getState().scene.devices[0].layers;
      expect(layers[0].name).toBe("Second");
      expect(layers[1].name).toBe("First");
    });
  });

  // ── Keyframes ─────────────────────────────────────────────────────────

  describe("keyframes", () => {
    it("adds and removes device keyframes", () => {
      const devId = getState().addDevice({
        name: "Phone",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });

      const kfId = getState().addDeviceKeyframe(devId, {
        property: "position.x",
        time: 0,
        value: 0,
        easing: "linear",
      });

      expect(kfId).toContain("kf_");
      expect(getState().scene.devices[0].keyframes).toHaveLength(1);

      getState().removeDeviceKeyframe(devId, kfId);
      expect(getState().scene.devices[0].keyframes).toHaveLength(0);
    });

    it("adds camera keyframes", () => {
      getState().addCameraKeyframe({
        time: 0,
        position: [0, 5, 10],
        lookAt: [0, 0, 0],
        fov: 50,
        easing: "ease-in-out",
      });

      expect(getState().scene.camera.keyframes).toHaveLength(1);
      expect(getState().scene.camera.keyframes[0].position).toEqual([0, 5, 10]);
    });
  });

  // ── Editor state ──────────────────────────────────────────────────────

  describe("editor state", () => {
    it("selects device and layer", () => {
      getState().selectDevice("dev-123");
      expect(getState().editor.selectedDeviceId).toBe("dev-123");

      getState().selectLayer("layer-456");
      expect(getState().editor.selectedLayerId).toBe("layer-456");
    });

    it("sets current time", () => {
      getState().setCurrentTime(5.5);
      expect(getState().editor.currentTime).toBe(5.5);
    });

    it("sets playing state", () => {
      getState().setPlaying(true);
      expect(getState().editor.isPlaying).toBe(true);

      getState().setPlaying(false);
      expect(getState().editor.isPlaying).toBe(false);
    });
  });

  // ── JSON serialization ────────────────────────────────────────────────

  describe("JSON serialization", () => {
    it("serializes and deserializes a scene", () => {
      getState().addDevice({
        name: "Phone",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });

      const json = getState().toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(1);
      expect(parsed.devices).toHaveLength(1);
      expect(parsed.devices[0].name).toBe("Phone");
    });

    it("loads a scene from object", () => {
      const scene = {
        version: 2,
        name: "Loaded Scene",
        canvas: {
          width: 3840,
          height: 2160,
          fps: 30,
          duration: 15,
          backgroundColor: "#000000",
        },
        devices: [],
        camera: { fov: 60, keyframes: [] },
        environment: { type: "sunset" as const, intensity: 0.8, background: "#ff6600" },
      };

      getState().loadScene(scene);
      expect(getState().scene.name).toBe("Loaded Scene");
      expect(getState().scene.canvas.width).toBe(3840);
      expect(getState().scene.environment.type).toBe("sunset");
    });

    it("resetScene restores defaults", () => {
      getState().addDevice({
        name: "Phone",
        type: "procedural",
        model: "generic-phone",
        proceduralParams: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        screenContent: null,
      });
      getState().selectDevice("something");

      getState().resetScene();
      expect(getState().scene.devices).toHaveLength(0);
      expect(getState().editor.selectedDeviceId).toBeNull();
    });
  });
});
