"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { LessonModal } from "./lesson-modal";
import { SlotsModal } from "./slots-modal";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { TimetableSlot, Lesson } from "@/lib/data/timetable";
import type { GradebookSubject } from "@/lib/data/exams";

// day values are 0=Monday … 6=Sunday; the grid shows the Sat–Thu week
// common in Somalia. Change this list to change the school week.
export const TIMETABLE_DAYS: { value: number; labelKey: MessageKey }[] = [
  { value: 5, labelKey: "weekday.sat" },
  { value: 6, labelKey: "weekday.sun" },
  { value: 0, labelKey: "weekday.mon" },
  { value: 1, labelKey: "weekday.tue" },
  { value: 2, labelKey: "weekday.wed" },
  { value: 3, labelKey: "weekday.thu" },
];

function formatTime(t: string) {
  return t.slice(0, 5);
}

export function TimetableView({
  classes,
  selectedClassId,
  slots,
  lessons,
  subjects,
  teachers,
  teacherSubjects,
  canEdit,
}: {
  classes: { id: string; name: string }[];
  selectedClassId: string | null;
  slots: TimetableSlot[];
  lessons: Lesson[];
  subjects: GradebookSubject[];
  teachers: { id: string; full_name: string }[];
  teacherSubjects: { teacher_id: string; subject_id: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [editCell, setEditCell] = useState<{ day: number; slot: TimetableSlot } | null>(null);
  const [slotsOpen, setSlotsOpen] = useState(false);

  const byCell = new Map<string, Lesson>();
  for (const l of lessons) byCell.set(`${l.day}:${l.slot_id}`, l);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {classes.length > 0 && (
          <Segmented
            value={selectedClassId ?? ""}
            onChange={(v) => router.push(`/timetable?class=${v}`)}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
        <div className="flex-1" />
        {canEdit && (
          <Button variant="secondary" size="md" onClick={() => setSlotsOpen(true)}>
            <CalendarCog size={15} /> {t("tt.periods")}
          </Button>
        )}
      </div>

      {slots.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[13.5px] text-text-2">
            {canEdit ? t("tt.noPeriodsCanEdit") : t("tt.noPeriods")}
          </p>
        </Card>
      ) : !selectedClassId ? (
        <Card className="p-8 text-center">
          <p className="text-[13.5px] text-text-2">{t("tt.addClassFirst")}</p>
        </Card>
      ) : (
        <div className="rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]" style={{ minWidth: 760 }}>
              <thead>
                <tr className="text-[11px] font-semibold text-text-2 uppercase tracking-wide">
                  <th className="sticky left-0 z-10 bg-solid text-left px-4 py-3 border-b border-line min-w-[110px]">
                    {t("tt.period")}
                  </th>
                  {TIMETABLE_DAYS.map((d) => (
                    <th key={d.value} className="px-2 py-3 border-b border-line text-center min-w-[104px]">
                      {t(d.labelKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="sticky left-0 z-10 bg-solid px-4 py-2.5 border-r border-line/60">
                      <div className="font-medium">{slot.name}</div>
                      <div className="text-[11px] text-text-2">
                        {formatTime(slot.starts_at)}–{formatTime(slot.ends_at)}
                      </div>
                    </td>
                    {TIMETABLE_DAYS.map((d) => {
                      const lesson = byCell.get(`${d.value}:${slot.id}`);
                      return (
                        <td key={d.value} className="p-1 align-top">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setEditCell({ day: d.value, slot })}
                            className={`w-full min-h-[52px] rounded-lg px-2 py-1.5 text-left transition-colors ${
                              lesson
                                ? "bg-blue-soft/70 hover:bg-blue-soft"
                                : "hover:bg-hover"
                            } ${canEdit ? "" : "cursor-default"}`}
                          >
                            {lesson ? (
                              <>
                                <div className="text-[12.5px] font-medium text-blue truncate">
                                  {lesson.subject_name}
                                </div>
                                <div className="text-[11px] text-text-2 truncate">
                                  {lesson.teacher_name ?? t("tt.noTeacher")}
                                </div>
                              </>
                            ) : (
                              <span className="text-[11px] text-text-2/60">{canEdit ? "+" : ""}</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editCell && selectedClassId && (
        <LessonModal
          key={`${editCell.day}:${editCell.slot.id}`}
          open
          onClose={() => setEditCell(null)}
          classId={selectedClassId}
          day={editCell.day}
          dayLabel={(() => {
            const d = TIMETABLE_DAYS.find((d) => d.value === editCell.day);
            return d ? t(d.labelKey) : "";
          })()}
          slot={editCell.slot}
          lesson={byCell.get(`${editCell.day}:${editCell.slot.id}`) ?? null}
          subjects={subjects}
          teachers={teachers}
          teacherSubjects={teacherSubjects}
        />
      )}
      {slotsOpen && <SlotsModal open onClose={() => setSlotsOpen(false)} slots={slots} />}
    </div>
  );
}
