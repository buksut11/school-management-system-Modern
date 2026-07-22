"use client";

import { useState, useTransition } from "react";
import { NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toggleHomeworkDone } from "@/lib/actions/homework";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { FamilyHomeworkRow } from "@/lib/data/homework";

export function HomeworkFamilyView({ rows }: { rows: FamilyHomeworkRow[] }) {
  // Local "done" set keyed by homework:student, seeded from the server so
  // ticks feel instant; reverted if the save fails.
  const [done, setDone] = useState<Set<string>>(
    () =>
      new Set(
        rows.flatMap((h) => h.students.filter((s) => s.done).map((s) => `${h.id}:${s.id}`))
      )
  );
  const [, start] = useTransition();
  const { show } = useToast();

  function toggle(homeworkId: string, studentId: string) {
    const key = `${homeworkId}:${studentId}`;
    const next = !done.has(key);
    setDone((prev) => {
      const s = new Set(prev);
      if (next) s.add(key);
      else s.delete(key);
      return s;
    });
    start(async () => {
      const result = await toggleHomeworkDone(homeworkId, studentId, next);
      if (result?.error) {
        show(result.error);
        setDone((prev) => {
          const s = new Set(prev);
          if (next) s.delete(key);
          else s.add(key);
          return s;
        });
      }
    });
  }

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <NotebookPen size={26} className="mx-auto mb-3 text-text-2" />
        <p className="text-[13px] text-text-2">No homework has been set yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {rows.map((h) => (
        <Card key={h.id} className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {h.subject_name && <Badge tone="blue">{h.subject_name}</Badge>}
            <span className="text-[14px] font-semibold tracking-tight">{h.title}</span>
          </div>
          <div className="text-[12px] text-text-2">
            {h.class_name}
            {h.due_date ? ` · Due ${formatDate(h.due_date)}` : ""}
          </div>
          {h.details && <p className="mt-2 text-[13px] text-text whitespace-pre-wrap">{h.details}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            {h.students.map((s) => {
              const isDone = done.has(`${h.id}:${s.id}`);
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] cursor-pointer transition-colors ${
                    isDone ? "border-green/40 bg-green/10" : "border-line hover:bg-hover"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggle(h.id, s.id)}
                    className="w-4 h-4 accent-green"
                  />
                  <span>
                    {h.students.length > 1 ? s.full_name : "Mark done"}
                  </span>
                </label>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
