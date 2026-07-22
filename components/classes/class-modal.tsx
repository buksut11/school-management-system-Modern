"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveClass } from "@/lib/actions/classes";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { ClassWithStats } from "@/lib/data/classes";

export function ClassModal({
  open,
  onClose,
  klass,
  teachers,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  klass: ClassWithStats | null;
  teachers: { id: string; full_name: string }[];
  classes: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveClass, undefined);
  const { show } = useToast();
  const t = useT();

  useEffect(() => {
    if (state?.success) {
      show(klass ? t("class.updated") : t("class.created"));
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={klass ? t("class.edit") : t("class.add")}>
      <form action={formAction} className="space-y-4">
        {klass && <input type="hidden" name="id" value={klass.id} />}

        <div>
          <Label htmlFor="name">{t("class.name")}</Label>
          <Input id="name" name="name" defaultValue={klass?.name} placeholder="Form 1C" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="room">{t("field.room")}</Label>
            <Input id="room" name="room" defaultValue={klass?.room ?? ""} />
          </div>
          <div>
            <Label htmlFor="capacity">{t("field.capacity")}</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={klass?.capacity ?? 40} />
          </div>
        </div>

        <div>
          <Label htmlFor="teacher_id">{t("field.classTeacher")}</Label>
          <Select id="teacher_id" name="teacher_id" defaultValue={klass?.teacher_id ?? ""}>
            <option value="">{t("select.unassigned")}</option>
            {teachers.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.full_name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="base_fees">{t("field.termFees")}</Label>
          <Input id="base_fees" name="base_fees" type="number" min={0} defaultValue={klass?.base_fees ?? 0} />
        </div>

        <div>
          <Label htmlFor="next_class_id">{t("class.promotesTo")}</Label>
          <Select id="next_class_id" name="next_class_id" defaultValue={klass?.next_class_id ?? ""}>
            <option value="">{t("class.finalOption")}</option>
            {classes
              .filter((c) => c.id !== klass?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
          <p className="mt-1.5 text-[12px] text-text-2">{t("class.promotesHelp")}</p>
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
