"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { saveSubject } from "@/lib/actions/academics";
import { useToast } from "@/components/ui/toast";
import type { SubjectRow } from "@/lib/data/academics";

export function SubjectModal({
  open,
  onClose,
  subject,
  departments,
  teachers,
}: {
  open: boolean;
  onClose: () => void;
  subject: SubjectRow | null;
  departments: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveSubject, undefined);
  const { show } = useToast();
  const [type, setType] = useState(subject?.type ?? "core");

  useEffect(() => {
    if (state?.success) {
      show(subject ? "Subject updated" : "Subject created");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={subject ? "Edit Subject" : "Add Subject"}>
      <form action={formAction} className="space-y-4">
        {subject && <input type="hidden" name="id" value={subject.id} />}
        <input type="hidden" name="type" value={type} />

        <div>
          <Label htmlFor="name">Subject name</Label>
          <Input id="name" name="name" defaultValue={subject?.name} placeholder="Biology" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="department_id">Department</Label>
            <Select id="department_id" name="department_id" defaultValue={subject?.department_id ?? ""}>
              <option value="">— Select —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="teacher_id">Teacher</Label>
            <Select id="teacher_id" name="teacher_id" defaultValue={subject?.teacher_id ?? ""}>
              <option value="">— Unassigned —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <Label>Type</Label>
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: "core", label: "Core" },
                { value: "elective", label: "Elective" },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="periods_per_week">Periods/week</Label>
            <Input
              id="periods_per_week"
              name="periods_per_week"
              type="number"
              min={0}
              defaultValue={subject?.periods_per_week ?? 0}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" defaultValue={subject?.description ?? ""} />
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
