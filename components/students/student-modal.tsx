"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { saveStudent } from "@/lib/actions/students";
import { useToast } from "@/components/ui/toast";
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
  const feesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      show(student ? "Student updated" : "Student added");
      onSaved?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={student ? "Edit Student" : "Add Student"}>
      <form action={formAction} className="space-y-4">
        {student && <input type="hidden" name="id" value={student.id} />}

        <PhotoPicker
          name="photo_url"
          folder="students"
          initialUrl={student?.photo_url}
          displayName={student?.full_name ?? ""}
        />

        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" defaultValue={student?.full_name} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" name="dob" type="date" defaultValue={student?.dob ?? ""} />
          </div>
          <div>
            <Label>Gender</Label>
            <SegmentedField
              name="gender"
              defaultValue={student?.gender ?? "male"}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={student?.address ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="mobile">Student mobile</Label>
            <Input id="mobile" name="mobile" defaultValue={student?.mobile ?? ""} />
          </div>
          <div>
            <Label htmlFor="parent_mobile">Parent mobile</Label>
            <Input id="parent_mobile" name="parent_mobile" defaultValue={student?.parent_mobile ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="class_id">Class</Label>
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
              <option value="">— Select —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="base_fees">Term fees ($)</Label>
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
              <p className="text-[11.5px] text-text-2 mt-1">Auto-fills from the class fee — edit if needed.</p>
            )}
          </div>
        </div>

        <div>
          <Label>Enrollment status</Label>
          <SegmentedField
            name="status"
            defaultValue={student?.status ?? "active"}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
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
