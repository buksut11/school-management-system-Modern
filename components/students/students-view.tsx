"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { StudentsTable } from "./students-table";
import { StudentsGrid } from "./students-grid";
import { StudentModal } from "./student-modal";
import { deleteStudent } from "@/lib/actions/students";
import { useToast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/utils";
import type { StudentWithClass } from "@/lib/data/students";

export function StudentsView({
  students,
  classes,
}: {
  students: StudentWithClass[];
  classes: { id: string; name: string; base_fees: number }[];
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentWithClass | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        `stu-${1000 + s.seq}`.includes(q) ||
        (s.class_name ?? "").toLowerCase().includes(q)
    );
  }, [students, query]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(s: StudentWithClass) {
    setEditing(s);
    setModalOpen(true);
  }

  function onDelete(s: StudentWithClass) {
    if (!confirm(`Remove ${s.full_name}? This also removes their attendance history.`)) return;
    startTransition(async () => {
      await deleteStudent(s.id, s.full_name);
      show("Student removed");
    });
  }

  function exportCsv() {
    downloadCsv(
      "students.csv",
      filtered.map((s) => ({
        id: `STU-${1000 + s.seq}`,
        name: s.full_name,
        class: s.class_name ?? "",
        gender: s.gender ?? "",
        dob: s.dob ? formatDate(s.dob) : "",
        address: s.address ?? "",
        mobile: s.mobile ?? "",
        parent_mobile: s.parent_mobile ?? "",
        fees: s.base_fees,
        status: s.status,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, or class…"
            className="pl-9"
          />
        </div>
        <ViewToggle view={view} onChange={setView} />
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> Export
        </Button>
        <Button onClick={openAdd}>
          <Plus size={15} /> Add Student
        </Button>
      </div>

      {view === "list" ? (
        <StudentsTable students={filtered} onEdit={openEdit} onDelete={onDelete} />
      ) : (
        <StudentsGrid students={filtered} onEdit={openEdit} onDelete={onDelete} />
      )}

      <StudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        student={editing}
        classes={classes}
      />
    </div>
  );
}
