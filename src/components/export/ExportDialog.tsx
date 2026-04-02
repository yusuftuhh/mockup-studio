import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useSceneStore } from "../../stores/scene-store";

// ── Types ────────────────────────────────────────────────────────────────────

type ExportFormat = "mp4" | "h265" | "prores" | "webm" | "gif";

interface FormatOption {
  value: ExportFormat;
  label: string;
  ext: string;
}

interface ResolutionOption {
  label: string;
  width: number;
  height: number;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: FormatOption[] = [
  { value: "mp4", label: "MP4 H.264", ext: "mp4" },
  { value: "h265", label: "MP4 H.265", ext: "mp4" },
  { value: "prores", label: "ProRes 4444", ext: "mov" },
  { value: "webm", label: "WebM VP9", ext: "webm" },
  { value: "gif", label: "GIF", ext: "gif" },
];

const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "4K", width: 3840, height: 2160 },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const scene = useSceneStore((s) => s.scene);
  const fps = scene.canvas.fps;
  const duration = scene.canvas.duration;

  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [resolution, setResolution] = useState(1); // index into RESOLUTION_OPTIONS
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const frameCount = Math.ceil(duration * fps);
  const res = RESOLUTION_OPTIONS[resolution];
  const fmt = FORMAT_OPTIONS.find((f) => f.value === format)!;

  const handleExport = useCallback(async () => {
    setError(null);
    setProgress(0);

    // Pick save location
    const outputPath = await save({
      defaultPath: `mockup-export.${fmt.ext}`,
      filters: [{ name: fmt.label, extensions: [fmt.ext] }],
    });

    if (!outputPath) return;

    setExporting(true);

    try {
      // Create temp directory for frames
      const framesDir = outputPath.replace(/\.[^.]+$/, "") + "_frames";
      await invoke("ensure_dir", { path: framesDir });

      // Capture frames from the viewport canvas
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) {
        throw new Error("No canvas element found in viewport");
      }

      for (let i = 0; i < frameCount; i++) {
        // Update scene time to render this frame
        const time = (i / fps);
        useSceneStore.getState().setCurrentTime(time);

        // Wait for a render tick
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Capture the canvas as PNG
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/png"
          );
        });

        const arrayBuffer = await blob.arrayBuffer();
        const data = Array.from(new Uint8Array(arrayBuffer));
        const frameName = `frame_${String(i).padStart(5, "0")}.png`;
        await invoke("save_binary", {
          path: `${framesDir}/${frameName}`,
          data,
        });

        setProgress(Math.round(((i + 1) / frameCount) * 80));
      }

      // Run FFmpeg to stitch frames into video
      setProgress(85);

      await invoke<string>("export_frames_to_video", {
        framesDir,
        outputPath,
        width: res.width,
        height: res.height,
        fps,
        format,
      });

      setProgress(100);

      // Brief delay so user sees 100%
      setTimeout(() => {
        setExporting(false);
        onOpenChange(false);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setExporting(false);
    }
  }, [format, resolution, fps, duration, frameCount, res, fmt, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg shadow-xl p-6">
          <Dialog.Title className="text-base font-semibold text-white mb-4">
            Export Video
          </Dialog.Title>

          <div className="space-y-4">
            {/* Format */}
            <div>
              <label className="block text-xs text-[#888] mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                disabled={exporting}
                className="w-full bg-[#0f0f1e] border border-[#2a2a4a] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[#7c7cff]"
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-xs text-[#888] mb-1">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                disabled={exporting}
                className="w-full bg-[#0f0f1e] border border-[#2a2a4a] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[#7c7cff]"
              >
                {RESOLUTION_OPTIONS.map((opt, i) => (
                  <option key={opt.label} value={i}>
                    {opt.label} ({opt.width}x{opt.height})
                  </option>
                ))}
              </select>
            </div>

            {/* Info */}
            <div className="text-xs text-[#888] flex justify-between">
              <span>
                {duration}s @ {fps}fps
              </span>
              <span>{frameCount} frames</span>
            </div>

            {/* Progress bar */}
            {exporting && (
              <div className="space-y-1">
                <div className="w-full h-2 bg-[#0f0f1e] rounded overflow-hidden">
                  <div
                    className="h-full bg-[#7c7cff] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-[#888] text-center">{progress}%</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded p-2">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  className="px-3 py-1.5 text-xs text-[#888] hover:text-white transition-colors"
                  disabled={exporting}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="px-4 py-1.5 text-xs font-medium bg-[#7c7cff] hover:bg-[#6b6bf0] text-white rounded transition-colors disabled:opacity-50"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
