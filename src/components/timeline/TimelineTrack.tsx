interface TimelineTrackProps {
  label: string;
  color: string;
  timeRange: [number, number];
  duration: number;
  trackAreaWidth: number;
  isIndented?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function TimelineTrack({
  label,
  color,
  timeRange,
  duration,
  trackAreaWidth,
  isIndented = false,
  isSelected = false,
  onClick,
}: TimelineTrackProps) {
  const startPct = (timeRange[0] / duration) * 100;
  const widthPct = ((timeRange[1] - timeRange[0]) / duration) * 100;

  return (
    <div
      className={`flex items-center h-6 cursor-pointer group ${
        isSelected ? "bg-[#7c7cff]/10" : "hover:bg-[#ffffff05]"
      }`}
      onClick={onClick}
    >
      {/* Label area */}
      <div
        className={`w-[140px] shrink-0 text-xs truncate pr-2 ${
          isIndented ? "pl-6" : "pl-2"
        } ${isSelected ? "text-[#7c7cff]" : "text-[#888]"}`}
      >
        {isIndented && (
          <span className="text-[#444] mr-1">{">"}</span>
        )}
        {label}
      </div>

      {/* Track area */}
      <div className="flex-1 relative h-full" style={{ width: trackAreaWidth }}>
        <div
          className="absolute top-1 bottom-1 rounded-sm opacity-80 group-hover:opacity-100 transition-opacity"
          style={{
            left: `${startPct}%`,
            width: `${widthPct}%`,
            backgroundColor: color,
            minWidth: "2px",
          }}
        />
      </div>
    </div>
  );
}
