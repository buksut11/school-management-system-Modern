"use client";

import { useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useIsCompact } from "@/lib/use-media-query";
import { usePagedList } from "@/lib/use-paged-list";
import { StudentsTable } from "./students-table";
import { StudentsGrid } from "./students-grid";
import { StudentModal } from "./student-modal";
import { deleteStudent, searchStudents } from "@/lib/actions/students";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/utils";
import { STUDENTS_PAGE_SIZE } from "@/lib/pagination";
import type { StudentWithClass, StudentsPage } from "@/lib/data/students";

export function StudentsView({
  initial,
  classes,
}: {
  initial: StudentsPage;
  classes: { id: string; name: string; base_fees: number }[];
}) {
  const { rows, hasMore, query, setQuery, loadMore, refresh, pending } = usePagedList<StudentWithClass>({
    initial,
    fetchPage: searchStudents,
    pageSize: STUDENTS_PAGE_SIZE,
  });
  const [view, setView] = useState<"list" | "grid">("list");
  const isCompact = useIsCompact();
  const activeView = isCompact ? "grid" : view;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentWithClass | null>(null);
  const [exporting, startExport] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(s: StudentWithClass) {
    setEditing(s);
    setModalOpen(true);
  }

  async function onDelete(s: StudentWithClass) {
    const ok = await confirm({
      title: `Remove ${s.full_name}?`,
      message: "This also removes their attendance history.",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    const result = await deleteStudent(s.id, s.full_name);
    show(result?.error ?? "Student removed");
    if (!result?.error) refresh();
  }

  // Export covers every student matching the current search, not just the
  // rows loaded on screen — so it pulls the full result set from the server.
  function exportCsv() {
    startExport(async () => {
      const all = await searchStudents({ search: query.trim(), offset: 0, limit: 100000 });
      downloadCsv(
        "students.csv",
        all.rows.map((s) => ({
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
    });
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
        {!isCompact && <ViewToggle view={view} onChange={setView} />}
        <Button variant="secondary" size="md" onClick={exportCsv} disabled={exporting}>
          <Download size={15} /> {exporting ? "Exporting…" : "Export"}
        </Button>
        <Button onClick={openAdd}>
          <Plus size={15} /> Add Student
        </Button>
      </div>

      {activeView === "list" ? (
        <StudentsTable students={rows} onEdit={openEdit} onDelete={onDelete} />
      ) : (
        <StudentsGrid students={rows} onEdit={openEdit} onDelete={onDelete} />
      )}

      {rows.length === 0 && query.trim() && !pending && (
        <p className="text-center text-[13px] text-text-2 py-6">No students match “{query.trim()}”.</p>
      )}

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" size="md" onClick={loadMore} disabled={pending}>
            {pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <StudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
        student={editing}
        classes={classes}
      />
    </div>
  );
}
