"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useIsCompact } from "@/lib/use-media-query";
import { SubjectsTable } from "./subjects-table";
import { SubjectsGrid } from "./subjects-grid";
import { SubjectModal } from "./subject-modal";
import { deleteSubject } from "@/lib/actions/academics";
import { useToast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/csv";
import type { SubjectRow } from "@/lib/data/academics";

export function SubjectsView({
  subjects,
  departments,
  teachers,
}: {
  subjects: SubjectRow[];
  departments: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const isCompact = useIsCompact();
  const activeView = isCompact ? "grid" : view;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((s) => {
      if (deptFilter !== "all" && s.department_id !== deptFilter) return false;
      if (q && !s.name.toLowerCase().includes(q) && !(s.teacher_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subjects, deptFilter, query]);

  const coreCount = subjects.filter((s) => s.type === "core").length;
  const totalPeriods = subjects.reduce((sum, s) => sum + s.periods_per_week, 0);

  function onDelete(s: SubjectRow) {
    if (!confirm(`Remove ${s.name}?`)) return;
    startTransition(async () => {
      await deleteSubject(s.id, s.name);
      show("Subject removed");
    });
  }

  function exportCsv() {
    downloadCsv(
      "subjects.csv",
      filtered.map((s) => ({
        id: `SUB-${String(s.seq).padStart(2, "0")}`,
        name: s.name,
        department: s.department_name ?? "",
        teacher: s.teacher_name ?? "",
        type: s.type,
        periods_per_week: s.periods_per_week,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Subjects" value={subjects.length} />
        <Stat label="Departments" value={departments.length} />
        <Stat label="Core subjects" value={coreCount} />
        <Stat label="Periods/wk" value={totalPeriods} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={deptFilter}
          onChange={setDeptFilter}
          options={[{ value: "all", label: "All" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
        />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects or teachers…"
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
          <Plus size={15} /> Add Subject
        </Button>
      </div>

      {activeView === "list" ? (
        <SubjectsTable
          subjects={filtered}
          onEdit={(s) => {
            setEditing(s);
            setModalOpen(true);
          }}
          onDelete={onDelete}
        />
      ) : (
        <SubjectsGrid
          subjects={filtered}
          onEdit={(s) => {
            setEditing(s);
            setModalOpen(true);
          }}
          onDelete={onDelete}
        />
      )}

      <SubjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        subject={editing}
        departments={departments}
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
