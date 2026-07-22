"use client";

import { useState, useTransition } from "react";
import { GraduationCap, ArrowRight, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { loadPromotionPlan, promoteStudents } from "@/lib/actions/promotion";
import { useT } from "@/lib/i18n/client";
import type { PromotionPlan } from "@/lib/data/promotion";

export function PromotionPanel() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PromotionPlan | null>(null);
  const [held, setHeld] = useState<Set<string>>(new Set());
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();
  const { show } = useToast();
  const t = useT();

  function openModal() {
    setHeld(new Set());
    setPlan(null);
    setOpen(true);
    startLoad(async () => setPlan(await loadPromotionPlan()));
  }

  function toggle(id: string) {
    setHeld((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const classesWithStudents = (plan?.classes ?? []).filter((c) => c.students.length > 0);

  let willAdvance = 0;
  let willGraduate = 0;
  for (const c of classesWithStudents) {
    for (const s of c.students) {
      if (held.has(s.id)) continue;
      if (c.next_class_id) willAdvance++;
      else willGraduate++;
    }
  }

  function run() {
    startSave(async () => {
      const result = await promoteStudents([...held]);
      if (result.error) {
        show(result.error);
        return;
      }
      show(t("set.promoteComplete", { promoted: result.promoted ?? 0, graduated: result.graduated ?? 0 }));
      setOpen(false);
    });
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.promotion")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.promotionDesc")}</p>

      <Button variant="secondary" onClick={openModal}>
        <GraduationCap size={15} /> {t("set.reviewPromote")}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("set.promoteStudents")}>
        {loading || !plan ? (
          <p className="text-[13px] text-text-2 py-6 text-center">{t("set.loading")}</p>
        ) : !plan.currentYear ? (
          <p className="text-[13px] text-text-2 py-6 text-center">{t("set.promoteNoYear")}</p>
        ) : classesWithStudents.length === 0 ? (
          <p className="text-[13px] text-text-2 py-6 text-center">{t("set.promoteNoStudents")}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-orange/10 px-3.5 py-3 text-[12.5px]">
              <AlertTriangle size={16} className="text-orange flex-none mt-0.5" />
              <span>{t("set.advancingFor", { year: plan.currentYear })}</span>
            </div>

            <div className="max-h-[46vh] overflow-y-auto space-y-4 pr-1">
              {classesWithStudents.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center gap-2 mb-1.5 text-[13px] font-medium">
                    <span>{c.name}</span>
                    <ArrowRight size={13} className="text-text-2" />
                    {c.next_class_name ? (
                      <span>{c.next_class_name}</span>
                    ) : (
                      <Badge tone="purple">{t("set.graduate")}</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {c.students.map((s) => {
                      const promoting = !held.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-hover cursor-pointer text-[13px]"
                        >
                          <input
                            type="checkbox"
                            checked={promoting}
                            onChange={() => toggle(s.id)}
                            className="w-4 h-4 accent-blue"
                          />
                          <span className={promoting ? "" : "text-text-2 line-through"}>
                            {s.full_name}
                          </span>
                          {!promoting && <span className="text-[11.5px] text-text-2">{t("set.holds")}</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-[12.5px] text-text-2">
                {t("set.promoteSummary", { advance: willAdvance, graduate: willGraduate, held: held.size })}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={run} disabled={saving || willAdvance + willGraduate === 0}>
                  {saving ? t("set.promoting") : t("set.promoteStudents")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
