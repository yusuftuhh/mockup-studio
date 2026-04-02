use std::fs;
use std::path::Path;

#[tauri::command]
pub fn save_scene(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to save scene: {e}"))
}

#[tauri::command]
pub fn load_scene(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to load scene: {e}"))
}

#[tauri::command]
pub fn ensure_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {e}"))
}

#[tauri::command]
pub fn save_binary(path: String, data: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {e}"))?;
    }
    fs::write(&path, data).map_err(|e| format!("Failed to save binary: {e}"))
}
