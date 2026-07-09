"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useIsCompact } from "@/lib/use-media-query";
import { DepartmentsTable } from "./departments-table";
import { DepartmentsGrid } from "./departments-grid";
import { DepartmentModal } from "./department-modal";
import { deleteDepartment } from "@/lib/actions/academics";
import { useToast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/csv";
import type { DepartmentRow } from "@/lib/data/academics";

export function DepartmentsView({
  departments,
  teachers,
}: {
  departments: DepartmentRow[];
  teachers: { id: string; full_name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const isCompact = useIsCompact();
  const activeView = isCompact ? "grid" : view;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, query]);

  const totalSubjects = departments.reduce((sum, d) => sum + d.subject_count, 0);
  const headsAssigned = departments.filter((d) => d.head_teacher_id).length;
  const totalPeriods = departments.reduce((sum, d) => sum + d.periods_per_week, 0);

  function onDelete(d: DepartmentRow) {
    if (!confirm(`Remove ${d.name}? Its subjects will become unassigned.`)) return;
    startTransition(async () => {
      await deleteDepartment(d.id, d.name);
      show("Department removed");
    });
  }

  function exportCsv() {
    downloadCsv(
      "departments.csv",
      filtered.map((d) => ({
        id: `DEP-${String(d.seq).padStart(2, "0")}`,
        name: d.name,
        head: d.head_teacher_name ?? "",
        subjects: d.subject_count,
        teachers: d.teacher_count,
        periods_per_week: d.periods_per_week,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Departments" value={departments.length} />
        <Stat label="Subjects offered" value={totalSubjects} />
        <Stat label="Heads assigned" value={headsAssigned} />
        <Stat label="Periods/wk" value={totalPeriods} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments…"
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
          <Plus size={15} /> Add Department
        </Button>
      </div>

      {activeView === "list" ? (
        <DepartmentsTable
          departments={filtered}
          onEdit={(d) => {
            setEditing(d);
            setModalOpen(true);
          }}
          onDelete={onDelete}
        />
      ) : (
        <DepartmentsGrid
          departments={filtered}
          onEdit={(d) => {
            setEditing(d);
            setModalOpen(true);
          }}
          onDelete={onDelete}
        />
      )}

      <DepartmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        department={editing}
        teachers={teachers}
      />
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
