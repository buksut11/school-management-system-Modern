"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { saveTeacher } from "@/lib/actions/teachers";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { TeacherWithClass } from "@/lib/data/teachers";
import type { GradebookSubject } from "@/lib/data/exams";

function SubjectPicker({
  subjects,
  initialIds,
}: {
  subjects: GradebookSubject[];
  initialIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (subjects.length === 0) {
    return (
      <p className="text-[12.5px] text-text-2 bg-card-2 rounded-lg px-3 py-2">
        No subjects yet — add them on the Subjects page first.
      </p>
    );
  }

  return (
    <>
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="subject_ids" value={id} />
      ))}
      <div className="flex flex-wrap gap-1.5">
        {subjects.map((s) => {
          const on = selected.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              aria-pressed={on}
              className={cn(
                "px-2.5 h-8 rounded-lg text-[12.5px] font-medium border transition-colors",
                on
                  ? "bg-blue text-white border-blue"
                  : "bg-input text-text-2 border-transparent hover:bg-hover"
              )}
            >
              {s.name}
            </button>
          );
        })}
      </div>
    </>
  );
}

function SegmentedField({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Segmented options={options} value={value} onChange={setValue} />
    </>
  );
}

export function TeacherModal({
  open,
  onClose,
  onSaved,
  teacher,
  classes,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  teacher: TeacherWithClass | null;
  classes: { id: string; name: string }[];
  subjects: GradebookSubject[];
}) {
  const [state, formAction, pending] = useActionState(saveTeacher, undefined);
  const { show } = useToast();
  const t = useT();

  useEffect(() => {
    if (state?.success) {
      show(teacher ? t("teacher.updated") : t("teacher.added"));
      onSaved?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={teacher ? t("teacher.edit") : t("teacher.add")}>
      <form action={formAction} className="space-y-4">
        {teacher && <input type="hidden" name="id" value={teacher.id} />}

        <PhotoPicker
          name="photo_url"
          folder="teachers"
          initialUrl={teacher?.photo_url}
          displayName={teacher?.full_name ?? ""}
        />

        <div>
          <Label htmlFor="full_name">{t("field.fullName")}</Label>
          <Input id="full_name" name="full_name" defaultValue={teacher?.full_name} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dob">{t("field.dob")}</Label>
            <Input id="dob" name="dob" type="date" defaultValue={teacher?.dob ?? ""} />
          </div>
          <div>
            <Label>{t("field.gender")}</Label>
            <SegmentedField
              name="gender"
              defaultValue={teacher?.gender ?? "male"}
              options={[
                { value: "male", label: t("gender.male") },
                { value: "female", label: t("gender.female") },
              ]}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">{t("field.address")}</Label>
          <Input id="address" name="address" defaultValue={teacher?.address ?? ""} />
        </div>

        <div>
          <Label htmlFor="mobile">{t("field.mobile")}</Label>
          <Input id="mobile" name="mobile" defaultValue={teacher?.mobile ?? ""} />
        </div>

        <div>
          <Label>{t("field.subjectsTaught")}</Label>
          <SubjectPicker subjects={subjects} initialIds={teacher?.subject_ids ?? []} />
        </div>

        <div>
          <Label htmlFor="class_id">{t("field.assignedClass")}</Label>
          <Select id="class_id" name="class_id" defaultValue={teacher?.class_id ?? ""}>
            <option value="">{t("select.choose")}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>{t("field.employmentStatus")}</Label>
          <SegmentedField
            name="status"
            defaultValue={teacher?.status ?? "active"}
            options={[
              { value: "active", label: t("status.active") },
              { value: "inactive", label: t("status.inactive") },
            ]}
          />
        </div>

        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
