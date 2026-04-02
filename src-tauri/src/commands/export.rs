use std::process::Command;
use std::sync::atomic::{AtomicU32, Ordering};

static EXPORT_PROGRESS: AtomicU32 = AtomicU32::new(0);

#[tauri::command]
pub fn get_export_progress() -> u32 {
    EXPORT_PROGRESS.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn export_frames_to_video(
    frames_dir: String,
    output_path: String,
    width: u32,
    height: u32,
    fps: u32,
    format: String,
) -> Result<String, String> {
    EXPORT_PROGRESS.store(0, Ordering::Relaxed);

    let input_pattern = format!("{}/frame_%05d.png", frames_dir);
    let size_arg = format!("{}x{}", width, height);

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-framerate".into(),
        fps.to_string(),
        "-i".into(),
        input_pattern.clone(),
        "-s".into(),
        size_arg,
    ];

    match format.as_str() {
        "mp4" => {
            args.extend([
                "-c:v".into(),
                "libx264".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
                "-preset".into(),
                "medium".into(),
                "-crf".into(),
                "18".into(),
                output_path.clone(),
            ]);
        }
        "h265" => {
            args.extend([
                "-c:v".into(),
                "libx265".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
                "-preset".into(),
                "medium".into(),
                "-crf".into(),
                "22".into(),
                output_path.clone(),
            ]);
        }
        "prores" => {
            args.extend([
                "-c:v".into(),
                "prores_ks".into(),
                "-profile:v".into(),
                "4444".into(),
                "-pix_fmt".into(),
                "yuva444p10le".into(),
                output_path.clone(),
            ]);
        }
        "webm" => {
            args.extend([
                "-c:v".into(),
                "libvpx-vp9".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
                "-crf".into(),
                "30".into(),
                "-b:v".into(),
                "0".into(),
                output_path.clone(),
            ]);
        }
        "gif" => {
            // GIF requires two-pass: palette generation then encoding
            let palette_path = format!("{}/palette.png", frames_dir);

            let palette_output = Command::new("ffmpeg")
                .args([
                    "-y",
                    "-framerate",
                    &fps.to_string(),
                    "-i",
                    &input_pattern,
                    "-vf",
                    &format!("fps={},scale={}:-1:flags=lanczos,palettegen", fps, width),
                    &palette_path,
                ])
                .output()
                .map_err(|e| format!("Failed to run ffmpeg palettegen: {e}"))?;

            if !palette_output.status.success() {
                let stderr = String::from_utf8_lossy(&palette_output.stderr);
                return Err(format!("FFmpeg palettegen failed: {stderr}"));
            }

            EXPORT_PROGRESS.store(50, Ordering::Relaxed);

            let gif_output = Command::new("ffmpeg")
                .args([
                    "-y",
                    "-framerate",
                    &fps.to_string(),
                    "-i",
                    &input_pattern,
                    "-i",
                    &palette_path,
                    "-lavfi",
                    &format!(
                        "fps={},scale={}:-1:flags=lanczos[x];[x][1:v]paletteuse",
                        fps, width
                    ),
                    &output_path,
                ])
                .output()
                .map_err(|e| format!("Failed to run ffmpeg gif encode: {e}"))?;

            if !gif_output.status.success() {
                let stderr = String::from_utf8_lossy(&gif_output.stderr);
                return Err(format!("FFmpeg gif encode failed: {stderr}"));
            }

            EXPORT_PROGRESS.store(100, Ordering::Relaxed);
            return Ok(output_path);
        }
        _ => {
            return Err(format!("Unknown format: {format}"));
        }
    }

    let output = Command::new("ffmpeg")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg failed: {stderr}"));
    }

    EXPORT_PROGRESS.store(100, Ordering::Relaxed);
    Ok(output_path)
}
