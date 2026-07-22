"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveLesson, clearLesson } from "@/lib/actions/timetable";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { TimetableSlot, Lesson } from "@/lib/data/timetable";
import type { GradebookSubject } from "@/lib/data/exams";

export function LessonModal({
  open,
  onClose,
  classId,
  day,
  dayLabel,
  slot,
  lesson,
  subjects,
  teachers,
  teacherSubjects,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  day: number;
  dayLabel: string;
  slot: TimetableSlot;
  lesson: Lesson | null;
  subjects: GradebookSubject[];
  teachers: { id: string; full_name: string }[];
  teacherSubjects: { teacher_id: string; subject_id: string }[];
}) {
  const t = useT();
  const [subjectId, setSubjectId] = useState(lesson?.subject_id ?? "");
  const [teacherId, setTeacherId] = useState(lesson?.teacher_id ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  // Teachers linked to the chosen subject float to the top of the list.
  const orderedTeachers = useMemo(() => {
    if (!subjectId) return teachers.map((tchr) => ({ ...tchr, suggested: false }));
    const linked = new Set(
      teacherSubjects.filter((ts) => ts.subject_id === subjectId).map((ts) => ts.teacher_id)
    );
    return [...teachers]
      .map((tchr) => ({ ...tchr, suggested: linked.has(tchr.id) }))
      .sort((a, b) => Number(b.suggested) - Number(a.suggested));
  }, [subjectId, teachers, teacherSubjects]);

  function save() {
    setError("");
    startTransition(async () => {
      const result = await saveLesson({
        classId,
        day,
        slotId: slot.id,
        subjectId,
        teacherId: teacherId || null,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      show(t("tt.lessonSaved"));
      onClose();
    });
  }

  function clear() {
    startTransition(async () => {
      const result = await clearLesson(classId, day, slot.id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      show(t("tt.lessonCleared"));
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`${dayLabel} · ${slot.name}`}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="lesson-subject">{t("field.subject")}</Label>
          <Select
            id="lesson-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">{t("tt.selectSubject")}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="lesson-teacher">{t("field.teacher")}</Label>
          <Select
            id="lesson-teacher"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <option value="">{t("tt.noTeacherAssigned")}</option>
            {orderedTeachers.map((tchr) => (
              <option key={tchr.id} value={tchr.id}>
                {tchr.full_name}
                {tchr.suggested ? " ★" : ""}
              </option>
            ))}
          </Select>
          <p className="text-[11.5px] text-text-2 mt-1">{t("tt.teacherHint")}</p>
        </div>

        {error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between gap-2 pt-2">
          {lesson ? (
            <Button type="button" variant="danger" onClick={clear} disabled={pending}>
              {t("tt.clearLesson")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save} disabled={pending || !subjectId}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
