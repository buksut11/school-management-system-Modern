"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useIsCompact } from "@/lib/use-media-query";
import { ClassesTable } from "./classes-table";
import { ClassesGrid } from "./classes-grid";
import { ClassModal } from "./class-modal";
import { deleteClass } from "@/lib/actions/classes";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import type { ClassWithStats } from "@/lib/data/classes";

export function ClassesView({
  classes,
  teachers,
}: {
  classes: ClassWithStats[];
  teachers: { id: string; full_name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const isCompact = useIsCompact();
  const activeView = isCompact ? "grid" : view;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassWithStats | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.teacher_name ?? "").toLowerCase().includes(q)
    );
  }, [classes, query]);

  const totalStudents = classes.reduce((sum, c) => sum + c.enrolled, 0);
  const avgSize = classes.length ? Math.round(totalStudents / classes.length) : 0;
  const freeSeats = classes.reduce((sum, c) => sum + Math.max(0, c.capacity - c.enrolled), 0);

  async function onDelete(c: ClassWithStats) {
    const ok = await confirm({
      title: `Remove ${c.name}?`,
      message: "Students assigned to it will become unassigned.",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteClass(c.id, c.name);
      show("Class removed");
    });
  }

  function exportCsv() {
    downloadCsv(
      "classes.csv",
      filtered.map((c) => ({
        class: c.name,
        room: c.room ?? "",
        teacher: c.teacher_name ?? "",
        enrolled: c.enrolled,
        boys: c.boys,
        girls: c.girls,
        capacity: c.capacity,
        fees: c.base_fees,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Classes" value={classes.length} />
        <Stat label="Students enrolled" value={totalStudents} />
        <Stat label="Avg. class size" value={avgSize} />
        <Stat label="Free seats" value={freeSeats} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by class or teacher…"
            className="pl-9"
          />
        </div>
        {!isCompact && <ViewToggle view={view} onChange={setView} />}
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> Export
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={15} /> Add Class
        </Button>
      </div>

      {activeView === "list" ? (
        <ClassesTable
          classes={filtered}
          onEdit={(c) => {
            setEditing(c);
            setModalOpen(true);
          }}
          onDelete={onDelete}
        />
      ) : (
        <ClassesGrid
          classes={filtered}
          onEdit={(c) => {
            setEditing(c);
            setModalOpen(true);
          }}
          onDelete={onDelete}
        />
      )}

      <ClassModal open={modalOpen} onClose={() => setModalOpen(false)} klass={editing} teachers={teachers} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3.5 text-center">
      <div className="text-[20px] font-semibold">{value}</div>
      <div className="text-[11.5px] text-text-2">{label}</div>
    </Card>
  );
}
