"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveDepartment } from "@/lib/actions/academics";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { DepartmentRow } from "@/lib/data/academics";

export function DepartmentModal({
  open,
  onClose,
  department,
  teachers,
}: {
  open: boolean;
  onClose: () => void;
  department: DepartmentRow | null;
  teachers: { id: string; full_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveDepartment, undefined);
  const { show } = useToast();
  const t = useT();

  useEffect(() => {
    if (state?.success) {
      show(department ? t("dept.updated") : t("dept.created"));
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={department ? t("dept.edit") : t("dept.add")}>
      <form action={formAction} className="space-y-4">
        {department && <input type="hidden" name="id" value={department.id} />}

        <div>
          <Label htmlFor="name">{t("dept.name")}</Label>
          <Input id="name" name="name" defaultValue={department?.name} placeholder="Sciences" required />
        </div>

        <div>
          <Label htmlFor="head_teacher_id">{t("dept.head")}</Label>
          <Select id="head_teacher_id" name="head_teacher_id" defaultValue={department?.head_teacher_id ?? ""}>
            <option value="">{t("select.unassigned")}</option>
            {teachers.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.full_name}
              </option>
            ))}
          </Select>
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
