"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveExam } from "@/lib/actions/exams";
import { useToast } from "@/components/ui/toast";
import { GRADEBOOK_SUBJECTS } from "@/lib/constants";
import type { ExamRow } from "@/lib/data/exams";
import type { Term } from "@/lib/types/database";

export function ExamModal({
  open,
  onClose,
  exam,
  term,
  eligibleStudents,
}: {
  open: boolean;
  onClose: () => void;
  exam: ExamRow | null;
  term: Term;
  eligibleStudents: { id: string; full_name: string; class_id: string | null; class_name: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(saveExam, undefined);
  const { show } = useToast();
  const [studentId, setStudentId] = useState(exam?.student_id ?? "");
  const classId = exam?.class_id ?? eligibleStudents.find((s) => s.id === studentId)?.class_id ?? "";

  useEffect(() => {
    if (state?.success) {
      show(exam ? "Exam record updated" : "Exam record added");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={exam ? "Edit Exam Record" : "Add Exam Record"} widthClass="max-w-xl">
      <form action={formAction} className="space-y-4">
        {exam && <input type="hidden" name="id" value={exam.id} />}
        <input type="hidden" name="term" value={term} />
        <input type="hidden" name="class_id" value={classId} />

        <div>
          <Label htmlFor="student_id">Student</Label>
          {exam ? (
            <Input value={exam.student_name} disabled />
          ) : (
            <Select
              id="student_id"
              name="student_id"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              <option value="">— Select a student —</option>
              {eligibleStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} {s.class_name ? `(${s.class_name})` : ""}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="exam_date">Exam date</Label>
            <Input id="exam_date" name="exam_date" type="date" defaultValue={exam?.exam_date ?? new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <Label htmlFor="attendance_pct">Attendance %</Label>
            <Input id="attendance_pct" name="attendance_pct" type="number" min={0} max={100} defaultValue={exam?.attendance_pct ?? 100} />
          </div>
        </div>

        <div>
          <Label htmlFor="test_score">Test score</Label>
          <Input id="test_score" name="test_score" type="number" min={0} max={100} defaultValue={exam?.test_score ?? 0} />
        </div>

        <div>
          <Label>Subject scores</Label>
          <div className="grid grid-cols-2 gap-3">
            {GRADEBOOK_SUBJECTS.map((subject) => (
              <div key={subject}>
                <label className="text-[12px] text-text-2 mb-1 block">{subject}</label>
                <Input
                  name={`subject_${subject}`}
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={exam?.subject_scores[subject] ?? 0}
                />
              </div>
            ))}
          </div>
        </div>

        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
