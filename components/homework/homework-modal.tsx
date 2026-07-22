"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveHomework } from "@/lib/actions/homework";
import { useToast } from "@/components/ui/toast";
import type { HomeworkRow } from "@/lib/data/homework";

export function HomeworkModal({
  open,
  onClose,
  homework,
  classes,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  homework: HomeworkRow | null;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveHomework, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) {
      show(homework ? "Homework updated" : "Homework set");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={homework ? "Edit Homework" : "New Homework"}>
      <form action={formAction} className="space-y-4">
        {homework && <input type="hidden" name="id" value={homework.id} />}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="class_id">Class</Label>
            <Select id="class_id" name="class_id" defaultValue={homework?.class_id ?? ""} required>
              <option value="" disabled>
                Select a class
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="subject_id">Subject</Label>
            <Select id="subject_id" name="subject_id" defaultValue={homework?.subject_id ?? ""}>
              <option value="">— None —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={homework?.title} placeholder="e.g. Exercises 4.1–4.3" required />
        </div>

        <div>
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" defaultValue={homework?.due_date ?? ""} />
        </div>

        <div>
          <Label htmlFor="details">Details</Label>
          <textarea
            id="details"
            name="details"
            defaultValue={homework?.details ?? ""}
            rows={4}
            placeholder="What to do, page numbers, anything the class needs to know…"
            className="w-full rounded-xl px-3.5 py-2.5 text-[14px] bg-input text-text placeholder:text-text-2 border border-transparent transition-all duration-200 focus:bg-solid focus:border-blue/30 focus:ring-4 focus:ring-blue-soft resize-y"
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
