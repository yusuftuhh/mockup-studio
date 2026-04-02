use serde_json::{json, Value};

pub fn list_tools() -> Value {
    json!({
        "tools": [
            {
                "name": "create_scene",
                "description": "Create a new scene with given dimensions and duration",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string", "description": "Scene name" },
                        "width": { "type": "integer", "description": "Canvas width in pixels" },
                        "height": { "type": "integer", "description": "Canvas height in pixels" },
                        "duration": { "type": "number", "description": "Duration in seconds" },
                        "fps": { "type": "integer", "description": "Frames per second" }
                    },
                    "required": ["name", "width", "height"]
                }
            },
            {
                "name": "get_scene",
                "description": "Get the current scene state as JSON",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "add_device",
                "description": "Add a device mockup to the scene",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "model": { "type": "string", "description": "Device model (e.g. iphone-15-pro, macbook-pro-16)" },
                        "color": { "type": "string", "description": "Device color variant" },
                        "position": {
                            "type": "object",
                            "properties": {
                                "x": { "type": "number" },
                                "y": { "type": "number" },
                                "z": { "type": "number" }
                            },
                            "description": "3D position"
                        },
                        "rotation": {
                            "type": "object",
                            "properties": {
                                "x": { "type": "number" },
                                "y": { "type": "number" },
                                "z": { "type": "number" }
                            },
                            "description": "3D rotation in degrees"
                        }
                    },
                    "required": ["model"]
                }
            },
            {
                "name": "list_devices",
                "description": "List all devices currently in the scene",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "add_layer",
                "description": "Add a new layer to a device or the scene",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_id": { "type": "string", "description": "Target device ID (omit for scene-level layer)" },
                        "layer_type": { "type": "string", "description": "Layer type: screen, text, image, shape" },
                        "name": { "type": "string", "description": "Layer name" },
                        "properties": { "type": "object", "description": "Layer-specific properties" }
                    },
                    "required": ["layer_type", "name"]
                }
            },
            {
                "name": "update_layer",
                "description": "Update properties of an existing layer",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "layer_id": { "type": "string", "description": "Layer ID to update" },
                        "properties": { "type": "object", "description": "Properties to update" }
                    },
                    "required": ["layer_id", "properties"]
                }
            },
            {
                "name": "set_screen_content",
                "description": "Set the screen content of a device (screenshot or URL)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_id": { "type": "string", "description": "Device ID" },
                        "content_type": { "type": "string", "description": "Content type: image, url, color" },
                        "value": { "type": "string", "description": "Image path, URL, or color value" }
                    },
                    "required": ["device_id", "content_type", "value"]
                }
            },
            {
                "name": "apply_preset",
                "description": "Apply an animation preset to a device or layer",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "target_id": { "type": "string", "description": "Device or layer ID" },
                        "preset_name": { "type": "string", "description": "Preset name (e.g. orbit, float, slide-in)" },
                        "options": { "type": "object", "description": "Preset-specific options" }
                    },
                    "required": ["target_id", "preset_name"]
                }
            },
            {
                "name": "export_video",
                "description": "Export the scene as a video file",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "output_path": { "type": "string", "description": "Output file path" },
                        "format": { "type": "string", "description": "Video format: mp4, webm, gif" },
                        "quality": { "type": "string", "description": "Quality: low, medium, high, ultra" }
                    },
                    "required": ["output_path"]
                }
            },
            {
                "name": "list_available_models",
                "description": "List all available device models that can be added to the scene",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "list_presets",
                "description": "List all available animation presets",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        ]
    })
}
