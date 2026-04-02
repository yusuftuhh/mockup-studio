interface TimelinePlayheadProps {
  currentTime: number;
  duration: number;
  trackAreaWidth: number;
  trackAreaLeft: number;
}

export default function TimelinePlayhead({
  currentTime,
  duration,
  trackAreaWidth,
  trackAreaLeft,
}: TimelinePlayheadProps) {
  const x = trackAreaLeft + (currentTime / duration) * trackAreaWidth;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-10"
      style={{ left: `${x}px` }}
    >
      {/* Diamond indicator at top */}
      <div
        className="absolute -top-0.5 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "6px solid #7c7cff",
        }}
      />
      {/* Vertical line */}
      <div className="absolute top-1.5 bottom-0 w-px bg-[#7c7cff] -translate-x-1/2" />
    </div>
  );
}
