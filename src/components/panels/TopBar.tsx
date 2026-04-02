import { useState } from "react";
import { useSceneStore } from "../../stores/scene-store";
import ExportDialog from "../export/ExportDialog";

export default function TopBar() {
  const sceneName = useSceneStore((s) => s.scene.name);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <div className="h-11 bg-[#1a1a2e] border-b border-[#2a2a4a] flex items-center justify-between px-4 shrink-0">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#7c7cff] flex items-center justify-center text-xs font-bold text-white">
              M
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              MockupStudio
            </span>
          </div>
          <span className="text-[#555] text-xs">|</span>
          <span className="text-sm text-[#888]">{sceneName}</span>
        </div>

        {/* Right: Status + Export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-[#888]">MCP Ready</span>
          </div>
          <button
            className="px-3 py-1 text-xs font-medium bg-[#7c7cff] hover:bg-[#6b6bf0] text-white rounded transition-colors"
            onClick={() => setExportOpen(true)}
          >
            Export
          </button>
        </div>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );
}
