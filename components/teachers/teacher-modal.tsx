"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { saveTeacher } from "@/lib/actions/teachers";
import { useToast } from "@/components/ui/toast";
import type { TeacherWithClass } from "@/lib/data/teachers";

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
  teacher,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  teacher: TeacherWithClass | null;
  classes: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveTeacher, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) {
      show(teacher ? "Teacher updated" : "Teacher added");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={teacher ? "Edit Teacher" : "Add Teacher"}>
      <form action={formAction} className="space-y-4">
        {teacher && <input type="hidden" name="id" value={teacher.id} />}

        <PhotoPicker
          name="photo_url"
          folder="teachers"
          initialUrl={teacher?.photo_url}
          displayName={teacher?.full_name ?? ""}
        />

        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" defaultValue={teacher?.full_name} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" name="dob" type="date" defaultValue={teacher?.dob ?? ""} />
          </div>
          <div>
            <Label>Gender</Label>
            <SegmentedField
              name="gender"
              defaultValue={teacher?.gender ?? "male"}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={teacher?.address ?? ""} />
        </div>

        <div>
          <Label htmlFor="mobile">Mobile</Label>
          <Input id="mobile" name="mobile" defaultValue={teacher?.mobile ?? ""} />
        </div>

        <div>
          <Label htmlFor="subjects">Subjects (comma separated)</Label>
          <Input
            id="subjects"
            name="subjects"
            defaultValue={teacher?.subjects.join(", ") ?? ""}
            placeholder="Maths, Physics"
          />
        </div>

        <div>
          <Label htmlFor="class_id">Assigned class</Label>
          <Select id="class_id" name="class_id" defaultValue={teacher?.class_id ?? ""}>
            <option value="">— Select —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Employment status</Label>
          <SegmentedField
            name="status"
            defaultValue={teacher?.status ?? "active"}
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
