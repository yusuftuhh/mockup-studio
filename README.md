# MockupStudio

A desktop app for building 3D device mockup promo videos. Drop a screen recording onto an iPhone, add a spotlight, blur the rest, animate the camera, render an MP4. The kind of clip you would normally pay Rotato for, plus full per-region screen control and a built-in MCP server so a CLI agent can drive the editor.

Built for macOS on Apple Silicon. Tauri shell, React Three Fiber viewport, Rust backend for FFmpeg and file I/O.

## Status

Pre-1.0. The viewport, timeline, layer system, keyframe engine, GLTF device loader and FFmpeg export pipeline are wired up. Things move and render. UI rough edges exist. See `Limitations` for what is not done yet.

## What is in the box

* **3D viewport** with orbit camera, real device models (iPhone 16 Pro, 15, Galaxy S24, Pixel 9, iPad Air, iPad Pro 13", Galaxy Tab S9, Lenovo Tab K11, MacBook Pro 16", MacBook Air 15", Apple Watch Series 10) and procedural fallbacks for anything else.
* **Screen layer engine**. Drop images, videos, text, arrows, spotlights, blur or zoom regions directly onto the device screen. Each layer renders into an offscreen canvas that is mapped as a texture, so resolution stays sharp.
* **Spline-style transform gizmo** for moving, scaling and rotating layers without leaving the 3D view.
* **Timeline with keyframes** for any animatable property. Easing presets (linear, ease-in/out, spring, bounce, step). Entry and exit animations per layer (fade, slide, scale, bounce).
* **Export pipeline** through FFmpeg. MP4 out of the box, more formats configurable in the export dialog.
* **MCP server** as a separate Rust binary. Connects over WebSocket so a CLI agent (Claude Code, any MCP client) can list devices, create scenes, add layers, set keyframes and trigger renders without touching the GUI.

## Setup

You need a Mac on Apple Silicon, Node 20+, Rust 1.75+, and FFmpeg.

```bash
brew install ffmpeg rust node
git clone https://github.com/yusuftuhh/mockup-studio.git
cd mockup-studio
npm install
```

To run the desktop app in dev mode:

```bash
npm run tauri dev
```

The first launch compiles the Rust side, which takes a few minutes. Subsequent launches are fast.

To produce a release build:

```bash
npm run tauri build
```

The signed `.dmg` lands in `src-tauri/target/release/bundle/dmg/`.

## Using the editor

1. **Pick a device** from the Device panel on the left. The 3D model loads into the viewport.
2. **Add a layer** from the Layer panel. Drop in an image, paste a video file, or insert a primitive (text, arrow, spotlight, blur, zoom).
3. **Position the layer** by dragging the gizmo on the device screen. Use the Property panel for exact values.
4. **Set keyframes** on the Timeline. Click the diamond next to any property in the Property panel to record its current value at the playhead. Scrub the timeline and change the value to record the next keyframe.
5. **Preview** by hitting play. The loop scrubs the timeline at 60 fps in the viewport.
6. **Export** via the Export dialog. Pick resolution, framerate, codec, hit render. FFmpeg writes the file to your chosen path.

## Using the MCP server

The MCP binary is at `mcp-server/target/release/mockup-studio-mcp` after the first `cargo build --release` inside `mcp-server/`. Add it to your MCP client config (for Claude Code, edit `~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "mockup-studio": {
      "command": "/absolute/path/to/mockup-studio/mcp-server/target/release/mockup-studio-mcp"
    }
  }
}
```

With the desktop app running, the MCP server bridges to the editor over WebSocket. From the CLI you can then ask things like „create a scene with an iPhone 16 Pro, add my screen recording as the main layer, animate a slow zoom from 100 to 130 percent over 4 seconds, export at 1080p60".

## Project layout

```
src/                  React frontend
  components/         Viewport, timeline, panels, export dialog
  engine/             Keyframe interpolation, animation presets
  lib/                Device catalog, procedural geometry
  stores/             Zustand scene store
  types/              Shared TypeScript types
src-tauri/            Tauri shell + Rust commands
mcp-server/           Standalone MCP binary (Rust)
tests/                Vitest unit tests
```

## Tests

```bash
npm test          # one-shot run
npm run test:watch
```

Tests cover the keyframe interpolator, scene store reducers and a couple of layer composition cases. They run in jsdom. No headless 3D rendering in CI yet.

## Limitations

* macOS Apple Silicon only for now. Tauri makes Windows and Linux builds technically possible but they are not tested.
* Some Radix popovers misbehave when stacked on top of the 3D canvas. Workaround: close other panels first.
* No undo history yet. Save often.
* GLTF models are bundled for the listed devices only. Anything else falls back to a procedural box approximation.
* Export presets are wired for H.264 MP4. ProRes and image sequences are planned but not done.
* Cloud asset library is out of scope. Bring your own screen recordings.

## Support the project

If MockupStudio saves you an hour or replaces a paid tool in your stack, a small tip keeps the side projects shipping:

* Buy Me a Coffee: https://buymeacoffee.com/yusuftuhh
* GitHub Sponsors: https://github.com/sponsors/yusuftuhh

Stars on the repo are free and also help.

## License

MIT. See [LICENSE](LICENSE).
