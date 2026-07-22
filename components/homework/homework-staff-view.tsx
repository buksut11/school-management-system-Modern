"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, NotebookPen, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { HomeworkModal } from "./homework-modal";
import { deleteHomework } from "@/lib/actions/homework";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/utils";
import type { HomeworkRow } from "@/lib/data/homework";

export function HomeworkStaffView({
  rows,
  classes,
  subjects,
}: {
  rows: HomeworkRow[];
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}) {
  const [classFilter, setClassFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HomeworkRow | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

  const filtered = useMemo(
    () => (classFilter === "all" ? rows : rows.filter((r) => r.class_id === classFilter)),
    [rows, classFilter]
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(h: HomeworkRow) {
    setEditing(h);
    setModalOpen(true);
  }

  async function onDelete(h: HomeworkRow) {
    const ok = await confirm({
      title: `Remove "${h.title}"?`,
      message: "This homework and its completion ticks will be removed.",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteHomework(h.id, h.title);
      show(result?.error ?? "Homework removed");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-[180px]">
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1" />
        <Button onClick={openAdd}>
          <Plus size={15} /> New Homework
        </Button>
      </div>

      <div className="space-y-2.5">
        {filtered.map((h) => (
          <Card key={h.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {h.subject_name && <Badge tone="blue">{h.subject_name}</Badge>}
                  <span className="text-[14px] font-semibold tracking-tight">{h.title}</span>
                </div>
                <div className="text-[12px] text-text-2">
                  {h.class_name}
                  {h.due_date ? ` · Due ${formatDate(h.due_date)}` : ""}
                </div>
                {h.details && (
                  <p className="mt-2 text-[13px] text-text whitespace-pre-wrap">{h.details}</p>
                )}
                <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-text-2">
                  <CheckCircle2 size={14} className={h.done_count > 0 ? "text-green" : "text-text-2"} />
                  {h.done_count} of {h.total_count} marked done
                </div>
              </div>
              <div className="flex flex-none items-center gap-1">
                <button
                  onClick={() => openEdit(h)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(h)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="p-10 text-center">
            <NotebookPen size={26} className="mx-auto mb-3 text-text-2" />
            <p className="text-[13px] text-text-2">
              No homework yet. Use “New Homework” to set the first assignment.
            </p>
          </Card>
        )}
      </div>

      <HomeworkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        homework={editing}
        classes={classes}
        subjects={subjects}
      />
    </div>
  );
}
