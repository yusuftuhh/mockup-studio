mod commands;
mod websocket;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::file_io::save_scene,
            commands::file_io::load_scene,
            commands::file_io::ensure_dir,
            commands::file_io::save_binary,
            commands::export::get_export_progress,
            commands::export::export_frames_to_video,
        ])
        .setup(|_app| {
            tauri::async_runtime::spawn(async {
                websocket::start_ws_server(9876).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
