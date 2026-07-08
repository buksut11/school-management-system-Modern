export function OccupancyBar({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
  const color = pct >= 90 ? "var(--red)" : pct >= 70 ? "var(--orange)" : "var(--green)";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="h-1.5 flex-1 rounded-full bg-card-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11.5px] text-text-2 flex-none">{pct}%</span>
    </div>
  );
}
