"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useIsCompact } from "@/lib/use-media-query";
import { TeachersTable } from "./teachers-table";
import { TeachersGrid } from "./teachers-grid";
import { TeacherModal } from "./teacher-modal";
import { deleteTeacher } from "@/lib/actions/teachers";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import type { TeacherWithClass } from "@/lib/data/teachers";

export function TeachersView({
  teachers,
  classes,
}: {
  teachers: TeacherWithClass[];
  classes: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const isCompact = useIsCompact();
  const activeView = isCompact ? "grid" : view;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherWithClass | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.full_name.toLowerCase().includes(q) ||
        `tch-${100 + t.seq}`.includes(q) ||
        t.subjects.some((s) => s.toLowerCase().includes(q))
    );
  }, [teachers, query]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(t: TeacherWithClass) {
    setEditing(t);
    setModalOpen(true);
  }

  async function onDelete(t: TeacherWithClass) {
    const ok = await confirm({ title: `Remove ${t.full_name}?`, confirmLabel: "Remove" });
    if (!ok) return;
    startTransition(async () => {
      await deleteTeacher(t.id, t.full_name);
      show("Teacher removed");
    });
  }

  function exportCsv() {
    downloadCsv(
      "teachers.csv",
      filtered.map((t) => ({
        id: `TCH-${100 + t.seq}`,
        name: t.full_name,
        class: t.class_name ?? "",
        subjects: t.subjects.join("; "),
        gender: t.gender ?? "",
        mobile: t.mobile ?? "",
        status: t.status,
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
            placeholder="Search by name, ID, or subject…"
            className="pl-9"
          />
        </div>
        {!isCompact && <ViewToggle view={view} onChange={setView} />}
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> Export
        </Button>
        <Button onClick={openAdd}>
          <Plus size={15} /> Add Teacher
        </Button>
      </div>

      {activeView === "list" ? (
        <TeachersTable teachers={filtered} onEdit={openEdit} onDelete={onDelete} />
      ) : (
        <TeachersGrid teachers={filtered} onEdit={openEdit} onDelete={onDelete} />
      )}

      <TeacherModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        teacher={editing}
        classes={classes}
      />
    </div>
  );
}
