"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveClass } from "@/lib/actions/classes";
import { useToast } from "@/components/ui/toast";
import type { ClassWithStats } from "@/lib/data/classes";

export function ClassModal({
  open,
  onClose,
  klass,
  teachers,
}: {
  open: boolean;
  onClose: () => void;
  klass: ClassWithStats | null;
  teachers: { id: string; full_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveClass, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) {
      show(klass ? "Class updated" : "Class created");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={klass ? "Edit Class" : "Add Class"}>
      <form action={formAction} className="space-y-4">
        {klass && <input type="hidden" name="id" value={klass.id} />}

        <div>
          <Label htmlFor="name">Class name</Label>
          <Input id="name" name="name" defaultValue={klass?.name} placeholder="Form 1C" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="room">Room</Label>
            <Input id="room" name="room" defaultValue={klass?.room ?? ""} />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={klass?.capacity ?? 40} />
          </div>
        </div>

        <div>
          <Label htmlFor="teacher_id">Class teacher</Label>
          <Select id="teacher_id" name="teacher_id" defaultValue={klass?.teacher_id ?? ""}>
            <option value="">— Unassigned —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="base_fees">Term fees ($)</Label>
          <Input id="base_fees" name="base_fees" type="number" min={0} defaultValue={klass?.base_fees ?? 0} />
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
