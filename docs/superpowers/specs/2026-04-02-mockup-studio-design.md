# MockupStudio — Design Spec

## Overview

**MockupStudio** is a desktop application for creating professional app promotional videos with 3D device mockups, screen annotations, and animations. It replaces tools like Rotato while adding the critical feature Rotato lacks: full control over individual screen regions (overlays, spotlights, blur, annotations, zoom insets, region replacement).

**Target platform**: macOS (Apple Silicon, M4 Pro Max optimized)
**Tech stack**: Tauri v2 + React Three Fiber + FFmpeg
**Key differentiator**: Layer-based screen annotation engine + MCP server for Claude CLI integration

## Requirements Summary

- 3D device mockups with full rotation, zoom, pan
- Realistic GLTF models for common devices (iPhone, iPad, MacBook, Watch) + procedural generator for any device (Lenovo Tab K11 etc.)
- Layer-based annotation system: spotlight, blur, zoom, arrows, text, callouts, region replace, tap indicator, cursor, shapes
- Keyframe-based timeline with animation presets
- Video export: MP4 (H.264/H.265), ProRes, WebM, GIF, PNG sequence — up to 4K/60fps
- MCP server for full Claude CLI control (~30 tools)
- GUI-first with Claude CLI as power-user extension

## Architecture

### System Diagram

```
+------------------------------------------------------------------+
|                        TAURI SHELL                                |
|  +-----------------------------+  +---------------------------+   |
|  |      RUST BACKEND           |  |     MCP SERVER (JSON)     |   |
|  |  - FFmpeg Pipeline          |  |  - Claude CLI Interface   |   |
|  |  - Frame Capture Receiver   |  |  - Scene Read/Write       |   |
|  |  - File I/O (Import/Export) |  |  - Batch Export Commands  |   |
|  |  - File System Access        |  |  - Preset Generator       |   |
|  +-------------|---------------+  +-------------|-------------+   |
|                |   IPC (Tauri Commands)          |                |
+----------------|----------------------------------|----------------+
                 |                                  |
+----------------|----------------------------------|----------------+
|                        REACT FRONTEND                             |
|  +-----------------------------+  +---------------------------+   |
|  |     3D VIEWPORT (R3F)       |  |      EDITOR PANELS        |   |
|  |  - Three.js Scene           |  |  - Timeline (Keyframes)   |   |
|  |  - Device Models (GLTF)     |  |  - Layer Stack            |   |
|  |  - Procedural Devices       |  |  - Property Inspector     |   |
|  |  - Screen Texture Mapping   |  |  - Device Picker          |   |
|  |  - Camera Controls          |  |  - Preset Browser         |   |
|  |  - Overlay Layers           |  |  - Export Dialog          |   |
|  +-----------------------------+  +---------------------------+   |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |              SCENE STATE (Zustand Store)                    |  |
|  |  - Devices[] / Layers[] / Keyframes[] / Camera             |  |
|  |  - JSON-serializable (save/load/MCP access)                |  |
|  +------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

### Data Flow

- **Import**: Video/Image → Rust File I/O → R3F Texture
- **Edit**: User/Claude → Zustand Store → R3F Re-Render
- **Export**: R3F Canvas → Frame Capture (toDataURL) → IPC to Rust → FFmpeg encode → MP4/ProRes/...

### 6 Core Modules

#### 1. 3D Viewport

React Three Fiber scene with OrbitControls. Renders devices, screen content, overlay layers, and camera animation in real-time. WebGL2 with potential WebGPU upgrade path.

- OrbitControls: left-click orbit, middle-click pan, scroll zoom
- Camera presets: Perspective, Front, Side, Top
- Grid/axis helpers (toggleable)
- Real-time playback with playhead scrubbing
- Anti-aliasing, shadows, environment lighting

#### 2. Device System

Hybrid model approach: GLTF for realistic devices, procedural for custom/niche devices.

**GLTF Models** (bundled or user-importable):
- iPhone (15, 16 series)
- iPad Air, iPad Pro
- MacBook Pro, MacBook Air
- Apple Watch
- Android phones (Samsung Galaxy, Pixel)
- Generic phone/tablet/laptop

**Procedural Generator** parameters:
- `width`, `height` (mm) — physical dimensions
- `screenWidth`, `screenHeight` (px) — resolution
- `bezelTop`, `bezelBottom`, `bezelSide` (mm)
- `cornerRadius` (mm)
- `thickness` (mm)
- `color` — body color (hex)
- `material` — matte, glossy, metallic
- `cameraHole` — optional (position, size)
- `name` — display name

This allows creating any device including Lenovo Tab K11 by entering its specs from the manufacturer datasheet.

**Screen Content Mapping**: UV-mapped video/image texture onto the device screen face. Supports MP4, MOV, PNG, JPG, WebP. Video playback synced to timeline.

#### 3. Layer & Annotation Engine

The core differentiator. Each device has a layer stack. Layer 0 is always the screen content (video/image). Above it, users can add annotation layers:

**10 Layer Types:**

| # | Type | Description |
|---|------|-------------|
| 1 | **Spotlight** | Highlight area, dim rest. Circle or rectangle shape. Configurable dim opacity and feather. |
| 2 | **Blur** | Gaussian blur on a region. For hiding sensitive data. Adjustable strength (px). |
| 3 | **Zoom Inset** | Magnify a region and display as floating inset. Scale factor, position, frame style, connector line. |
| 4 | **Arrow** | Animated arrow pointing to UI element. Style: solid/dashed, head type, color, thickness. Entry animation. |
| 5 | **Text Label** | Text overlay. Font, size, color, background pill, shadow. Typewriter animation option. |
| 6 | **Callout / Badge** | Numbered badges (1, 2, 3) or info callouts with connector line to UI element. For step-by-step tutorials. |
| 7 | **Region Replace** | Replace rectangular area with different image/video. For swapping UI elements or showing alternatives. |
| 8 | **Tap Indicator** | Simulated finger tap with ripple animation. Shows where user should tap. |
| 9 | **Cursor / Hand** | Animated cursor or hand moving across screen. Path defined as bezier curve on timeline. |
| 10 | **Shape / Highlight** | Freeform shapes: rectangle, circle, line. As markup/highlight over UI elements. Color, opacity, stroke. |

**Common Layer Properties:**
- Position & size (relative to screen: 0-100% or absolute px)
- Time range (start/end on timeline, in seconds)
- Entry/exit animation (fade, slide, scale, bounce)
- Easing (linear, ease-in-out, spring, bounce)
- Opacity (0-100%)
- Lock/Visible toggle
- Keyframes (any property animatable over timeline)

**Layer Rendering**: Layers are rendered as 2D overlays onto a secondary offscreen Canvas (CanvasTexture). This canvas composites the screen content video/image with all annotation layers in screen-space (2D). The resulting CanvasTexture is then mapped onto the 3D device screen face as a material map. This keeps overlay logic simple (2D) while the device rotates in 3D.

#### 4. Timeline & Animation

Keyframe-based timeline with preset system.

**Timeline UI:**
- Horizontal tracks per device and per layer
- Keyframe diamonds on tracks (draggable)
- Playhead (draggable, with scrubbing)
- Zoom/snap controls
- Time ruler (seconds)
- Play/Pause/Rewind/Forward controls
- Loop toggle

**Keyframe System:**
- Any numeric property can be keyframed
- Interpolation: linear, ease-in, ease-out, ease-in-out, spring, bounce, step
- Bezier curve editor for custom easing
- Copy/paste keyframes

**Preset System:**
- Device presets: rotate-360, rotate-slow, flip, float, slide-in-left, slide-in-right, zoom-in, zoom-out, wobble
- Camera presets: orbit, dolly-in, fly-around, static-front, static-angle
- Layer presets: fade-in-out, typewriter, pulse, bounce-in, slide-up
- Users can save custom presets
- Presets are editable after applying (expanded to keyframes)

#### 5. Export Pipeline

Canvas frame capture → IPC to Rust → FFmpeg encoding.

**Process:**
1. Timeline is played frame-by-frame at export resolution
2. Each frame: R3F canvas → `toDataURL('image/png')` or `toBlob()`
3. Frame data sent to Rust backend via Tauri IPC (binary, not base64 for performance)
4. Rust accumulates frames and pipes to FFmpeg subprocess
5. FFmpeg encodes to target format

**Supported Formats:**

| Format | Codec | Use Case |
|--------|-------|----------|
| MP4 (H.264) | libx264 | Universal, App Store, YouTube, Social |
| MP4 (H.265) | libx265 | Smaller files, modern platforms |
| ProRes 4444 | prores_ks | Post-production, alpha channel, Final Cut |
| WebM | libvpx-vp9 | Web embedding |
| GIF | gif | Social media, previews |
| PNG Sequence | png | Frame-by-frame post-production |

**Resolution/FPS:**
- Presets: 720p, 1080p, 4K (3840x2160)
- Custom: any width/height
- FPS: 24, 30, 60 (custom supported)
- App Store preset sizes: iPhone 6.7", iPhone 6.1", iPad 12.9"

**Batch Export**: Render the same scene with different devices. One scene, multiple device outputs.

#### 6. MCP Server

Model Context Protocol server enabling full Claude CLI control of the application.

**Two communication channels:**
1. **Claude CLI ↔ MCP Server**: stdio transport (MCP server launched as subprocess by Claude CLI)
2. **MCP Server ↔ Tauri App**: Local WebSocket (MCP server connects to Tauri app's WS endpoint on localhost)

**Scene Format**: JSON (same format as save files)

**Tools (~30):**

```
SCENE MANAGEMENT:
  create_scene(name, width, height, fps, duration)
  open_scene(path)
  save_scene(path?)
  get_scene()

DEVICE CONTROL:
  add_device(type, model?, params?)
  update_device(id, rotation?, position?, scale?)
  remove_device(id)
  list_devices()
  list_available_models()

SCREEN CONTENT:
  set_screen_content(deviceId, source)
  replace_screen_region(deviceId, region, source)

LAYER CONTROL:
  add_layer(deviceId, type, properties)
  update_layer(layerId, properties)
  remove_layer(layerId)
  list_layers(deviceId?)
  reorder_layers(deviceId, layerIds[])

ANIMATION:
  add_keyframe(targetId, property, time, value, easing?)
  remove_keyframe(keyframeId)
  apply_preset(targetId, presetName)
  list_presets()
  set_camera(position?, lookAt?, fov?)
  add_camera_keyframe(time, position, lookAt, easing?)

EXPORT:
  export_video(format, resolution?, fps?, outputPath?)
  export_frame(time, format?, outputPath?)
  get_export_progress()

BATCH:
  batch_export(devices[], format, resolution?)
  apply_template(templateName, screenContent)
```

**Communication flow**: Claude CLI → (stdio) → MCP Server → (WebSocket to localhost) → Tauri App → Zustand Store → R3F re-render. Scene state changes from Claude trigger immediate UI updates.

## UI Layout

4-panel editor layout:

```
+--------------------------------------------------+
|                   TOP BAR                         |
|  Logo | File Edit View Devices Export | MCP | Exp |
+----------+---------------------+-----------------+
|          |                     |                  |
| DEVICES  |    3D VIEWPORT      |   PROPERTIES    |
| -------- |                     |   ----------    |
| LAYERS   |   (React Three      |   Selected      |
| (stack)  |    Fiber scene)     |   element's     |
|          |                     |   properties    |
|          |                     |   (sliders,     |
|          |                     |    inputs,      |
|          |                     |    pickers)     |
+----------+---------------------+-----------------+
|                  TIMELINE                         |
|  [<<][>][>>] 2.5s  | Track: Device | Layer tracks |
|  Keyframes on tracks, playhead, zoom/snap         |
+--------------------------------------------------+
```

- **Left panel** (240px): Device list + Layer stack. Drag & drop reordering. Eye/Lock icons per layer.
- **Center**: 3D Viewport. OrbitControls. Live preview with overlays. Playback info bar at bottom.
- **Right panel** (280px): Property inspector. Shows properties of selected element. All values editable with appropriate input types (sliders, color pickers, dropdowns).
- **Bottom panel** (180px): Timeline. Tracks per device + layer. Keyframe diamonds. Draggable playhead. Zoom/snap controls.

## Scene File Format

All project data stored as a single JSON file (`.mockup` extension):

```json
{
  "version": 1,
  "name": "App Promo",
  "canvas": {
    "width": 1920,
    "height": 1080,
    "fps": 60,
    "duration": 10,
    "backgroundColor": "#0a0a1a"
  },
  "devices": [
    {
      "id": "dev1",
      "type": "gltf",
      "model": "ipad-air",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "screenContent": {
        "type": "video",
        "source": "./assets/app-recording.mp4"
      },
      "layers": [
        {
          "id": "l1",
          "type": "spotlight",
          "visible": true,
          "locked": false,
          "properties": {
            "center": [180, 400],
            "radius": 60,
            "shape": "circle",
            "dimOpacity": 0.6,
            "feather": 12
          },
          "timeRange": [2.0, 5.5],
          "animation": {
            "entry": "fade",
            "exit": "fade",
            "easing": "ease-out"
          },
          "keyframes": []
        }
      ],
      "keyframes": [
        {
          "id": "kf1",
          "property": "rotation.y",
          "time": 0,
          "value": 0,
          "easing": "linear"
        },
        {
          "id": "kf2",
          "property": "rotation.y",
          "time": 10,
          "value": 6.283,
          "easing": "ease-in-out"
        }
      ]
    }
  ],
  "camera": {
    "fov": 50,
    "keyframes": [
      {
        "time": 0,
        "position": [0, 0, 5],
        "lookAt": [0, 0, 0],
        "easing": "linear"
      },
      {
        "time": 10,
        "position": [2, 1, 4],
        "lookAt": [0, 0, 0],
        "easing": "ease-in-out"
      }
    ]
  },
  "environment": {
    "type": "studio",
    "intensity": 1.0,
    "background": "#0a0a1a"
  }
}
```

## Technology Choices

| Component | Technology | Reason |
|-----------|-----------|--------|
| Desktop shell | Tauri v2 | Lightweight (~15MB), Rust backend, native windows |
| Frontend framework | React 19 | Ecosystem, component libraries, R3F compatibility |
| 3D rendering | React Three Fiber + Three.js | Largest 3D web ecosystem, GLTF support, community |
| State management | Zustand | Simple, JSON-serializable, compatible with MCP sync |
| UI components | Radix UI + Tailwind CSS | Accessible, themeable, dark-mode native |
| Timeline | Custom (Canvas-based) | No existing library matches our track/keyframe needs |
| Video encoding | FFmpeg (bundled via Rust) | Industry standard, all formats, proven |
| Frame capture | Canvas toDataURL/toBlob | Direct WebGL frame access |
| IPC | Tauri Commands (Rust ↔ JS) | Type-safe, binary transfer support |
| MCP server | Separate Rust binary (stdio) | Connects to Tauri app via WebSocket on localhost |
| Build tool | Vite | Fast HMR, Tauri-compatible |
| Language | TypeScript (frontend) + Rust (backend) | Type safety throughout |

## Error Handling

- **GLTF load failure**: Show placeholder wireframe device, log error, offer retry
- **Video decode failure**: Show static frame or checkerboard pattern, notify user
- **FFmpeg not found**: Bundle FFmpeg binary with Tauri app (sidecar)
- **Export failure**: Show error with FFmpeg stderr, offer retry with different settings
- **MCP connection lost**: Auto-reconnect with exponential backoff, queue pending commands
- **Large video files**: Stream frames to FFmpeg pipe (no temp files for individual frames)

## Testing Strategy

- **Unit tests**: Zustand store logic, keyframe interpolation, procedural device generation, scene serialization
- **Component tests**: React component rendering with React Testing Library
- **3D tests**: Snapshot testing of R3F scenes with @react-three/test-renderer
- **Integration tests**: Tauri IPC commands, FFmpeg pipeline (encode test frames)
- **MCP tests**: Tool invocations against running app, scene state verification
- **E2E tests**: Full workflow: create scene → add device → add layers → export video
