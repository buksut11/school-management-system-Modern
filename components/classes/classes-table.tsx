"use client";

import { Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { OccupancyBar } from "./occupancy-bar";
import type { ClassWithStats } from "@/lib/data/classes";

export function ClassesTable({
  classes,
  onEdit,
  onDelete,
}: {
  classes: ClassWithStats[];
  onEdit: (c: ClassWithStats) => void;
  onDelete: (c: ClassWithStats) => void;
}) {
  return (
    <div className="r-table cls-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="flex-1 min-w-[140px]">Class</div>
        <div className="w-32 flex-none ccol-teacher">Class Teacher</div>
        <div className="w-16 flex-none ccol-boys">Boys</div>
        <div className="w-16 flex-none ccol-girls">Girls</div>
        <div className="w-28 flex-none ccol-occ">Occupancy</div>
        <div className="w-20 flex-none">Fees</div>
        <div className="w-20 flex-none text-right">Actions</div>
      </div>

      <div className="divide-y divide-line/60">
        {classes.map((c) => (
          <div key={c.id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-ident r-cell flex-1 min-w-[140px]">
              <div className="text-[13.5px] font-medium">{c.name}</div>
              <div className="text-[11.5px] text-text-2">{c.room ?? "No room set"} · {c.enrolled} students</div>
            </div>
            <div className="r-cell ccol-teacher w-32 flex-none text-[13px] text-text-2 truncate" data-label="Class Teacher">
              {c.teacher_name ?? "Unassigned"}
            </div>
            <div className="r-cell ccol-boys w-16 flex-none text-[13px] text-text-2" data-label="Boys">
              {c.boys}
            </div>
            <div className="r-cell ccol-girls w-16 flex-none text-[13px] text-text-2" data-label="Girls">
              {c.girls}
            </div>
            <div className="r-cell ccol-occ w-28 flex-none" data-label="Occupancy">
              <OccupancyBar enrolled={c.enrolled} capacity={c.capacity} />
            </div>
            <div className="r-cell w-20 flex-none text-[13px] text-text-2" data-label="Fees">
              {formatMoney(c.base_fees)}
            </div>
            <div className="r-actions w-20 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(c)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(c)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">No classes found.</div>
        )}
      </div>
    </div>
  );
}
