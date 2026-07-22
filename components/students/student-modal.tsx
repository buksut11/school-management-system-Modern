"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { saveStudent } from "@/lib/actions/students";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { StudentWithClass } from "@/lib/data/students";

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

export function StudentModal({
  open,
  onClose,
  onSaved,
  student,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  student: StudentWithClass | null;
  classes: { id: string; name: string; base_fees: number }[];
}) {
  const [state, formAction, pending] = useActionState(saveStudent, undefined);
  const { show } = useToast();
  const t = useT();
  const feesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      show(student ? t("student.updated") : t("student.added"));
      onSaved?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={student ? t("student.edit") : t("student.add")}>
      <form action={formAction} className="space-y-4">
        {student && <input type="hidden" name="id" value={student.id} />}

        <PhotoPicker
          name="photo_url"
          folder="students"
          initialUrl={student?.photo_url}
          displayName={student?.full_name ?? ""}
        />

        <div>
          <Label htmlFor="full_name">{t("field.fullName")}</Label>
          <Input id="full_name" name="full_name" defaultValue={student?.full_name} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dob">{t("field.dob")}</Label>
            <Input id="dob" name="dob" type="date" defaultValue={student?.dob ?? ""} />
          </div>
          <div>
            <Label>{t("field.gender")}</Label>
            <SegmentedField
              name="gender"
              defaultValue={student?.gender ?? "male"}
              options={[
                { value: "male", label: t("gender.male") },
                { value: "female", label: t("gender.female") },
              ]}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">{t("field.address")}</Label>
          <Input id="address" name="address" defaultValue={student?.address ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="mobile">{t("field.studentMobile")}</Label>
            <Input id="mobile" name="mobile" defaultValue={student?.mobile ?? ""} />
          </div>
          <div>
            <Label htmlFor="parent_mobile">{t("field.parentMobile")}</Label>
            <Input id="parent_mobile" name="parent_mobile" defaultValue={student?.parent_mobile ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="class_id">{t("field.class")}</Label>
            <Select
              id="class_id"
              name="class_id"
              defaultValue={student?.class_id ?? ""}
              onChange={(e) => {
                // Only auto-fill fees for a brand-new student — editing an
                // existing one shouldn't clobber a fee that may have been
                // customized (scholarship, sibling discount, etc).
                if (student || !feesRef.current) return;
                const picked = classes.find((c) => c.id === e.target.value);
                if (picked) feesRef.current.value = String(picked.base_fees);
              }}
            >
              <option value="">{t("select.choose")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="base_fees">{t("field.termFees")}</Label>
            <Input
              ref={feesRef}
              id="base_fees"
              name="base_fees"
              type="number"
              min={0}
              step="1"
              defaultValue={student?.base_fees ?? 0}
            />
            {!student && (
              <p className="text-[11.5px] text-text-2 mt-1">{t("student.feesAutofill")}</p>
            )}
          </div>
        </div>

        <div>
          <Label>{t("field.enrollmentStatus")}</Label>
          <SegmentedField
            name="status"
            defaultValue={student?.status ?? "active"}
            options={[
              { value: "active", label: t("status.active") },
              { value: "inactive", label: t("status.inactive") },
              { value: "graduated", label: t("status.graduated") },
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
