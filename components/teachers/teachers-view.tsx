"use client";

import { useState, useTransition } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useIsCompact } from "@/lib/use-media-query";
import { usePagedList } from "@/lib/use-paged-list";
import { TeachersTable } from "./teachers-table";
import { TeachersGrid } from "./teachers-grid";
import { TeacherModal } from "./teacher-modal";
import { deleteTeacher, searchTeachers } from "@/lib/actions/teachers";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { useT } from "@/lib/i18n/client";
import { TEACHERS_PAGE_SIZE } from "@/lib/pagination";
import type { TeacherWithClass, TeachersPage } from "@/lib/data/teachers";
import type { GradebookSubject } from "@/lib/data/exams";

export function TeachersView({
  initial,
  classes,
  subjects,
}: {
  initial: TeachersPage;
  classes: { id: string; name: string }[];
  subjects: GradebookSubject[];
}) {
  const { rows, hasMore, query, setQuery, loadMore, refresh, pending } = usePagedList<TeacherWithClass>({
    initial,
    fetchPage: searchTeachers,
    pageSize: TEACHERS_PAGE_SIZE,
  });
  const [view, setView] = useState<"list" | "grid">("list");
  const isCompact = useIsCompact();
  const activeView = isCompact ? "grid" : view;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherWithClass | null>(null);
  const [exporting, startExport] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();
  const t = useT();

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(tc: TeacherWithClass) {
    setEditing(tc);
    setModalOpen(true);
  }

  async function onDelete(tc: TeacherWithClass) {
    const ok = await confirm({ title: t("teacher.removeTitle", { name: tc.full_name }), confirmLabel: t("common.remove") });
    if (!ok) return;
    try {
      await deleteTeacher(tc.id, tc.full_name);
      show(t("teacher.removed"));
      refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : t("teacher.couldNotRemove"));
    }
  }

  // Export covers every teacher matching the current search, not just the
  // rows loaded on screen.
  function exportCsv() {
    startExport(async () => {
      const all = await searchTeachers({ search: query.trim(), offset: 0, limit: 100000 });
      downloadCsv(
        "teachers.csv",
        all.rows.map((tc) => ({
          id: `TCH-${100 + tc.seq}`,
          name: tc.full_name,
          class: tc.class_name ?? "",
          subjects: tc.subjects.join("; "),
          gender: tc.gender ?? "",
          mobile: tc.mobile ?? "",
          status: tc.status,
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
            placeholder={t("teacher.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        {!isCompact && <ViewToggle view={view} onChange={setView} />}
        <Button variant="secondary" size="md" onClick={exportCsv} disabled={exporting}>
          <Download size={15} /> {exporting ? t("common.exporting") : t("common.export")}
        </Button>
        <Button onClick={openAdd}>
          <Plus size={15} /> {t("teacher.add")}
        </Button>
      </div>

      {activeView === "list" ? (
        <TeachersTable teachers={rows} onEdit={openEdit} onDelete={onDelete} />
      ) : (
        <TeachersGrid teachers={rows} onEdit={openEdit} onDelete={onDelete} />
      )}

      {rows.length === 0 && query.trim() && !pending && (
        <p className="text-center text-[13px] text-text-2 py-6">{t("teacher.none", { query: query.trim() })}</p>
      )}

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" size="md" onClick={loadMore} disabled={pending}>
            {pending ? t("common.loading") : t("common.loadMore")}
          </Button>
        </div>
      )}

      <TeacherModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
        teacher={editing}
        classes={classes}
        subjects={subjects}
      />
    </div>
  );
}
