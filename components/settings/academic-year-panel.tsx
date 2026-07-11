"use client";

import { useActionState, useEffect, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { addAcademicYear, setCurrentAcademicYear } from "@/lib/actions/years";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/utils";
import type { AcademicYear } from "@/lib/types/database";
import type { FormState } from "@/lib/actions/students";

export function AcademicYearPanel({ years }: { years: AcademicYear[] }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, formAction, pending] = useActionState(addAcademicYear, undefined);
  const { show } = useToast();
  const confirm = useConfirm();

  // Close the add form as soon as the action succeeds (state adjusted
  // during render, per React's derived-state pattern); the toast is a
  // side effect and stays in the effect below.
  const [seen, setSeen] = useState<FormState>(undefined);
  if (state !== seen) {
    setSeen(state);
    if (state?.success) setAdding(false);
  }

  useEffect(() => {
    if (state?.success) show("Academic year added");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function makeCurrent(y: AcademicYear) {
    const ok = await confirm({
      title: `Switch to ${y.name}?`,
      message:
        "Exams and fee balances are tracked per academic year. Switching resets every student's outstanding balance for the new year, and each active student's class is carried over as their starting enrollment — prior years stay on record.",
      confirmLabel: "Switch",
      tone: "primary",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await setCurrentAcademicYear(y.id, y.name);
      show(result?.error ?? `Current year is now ${y.name}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">Academic Years</h3>
      <p className="text-[12.5px] text-text-2 mb-4">
        Exams and fee balances are kept per academic year. Add the next year here and switch to it
        when the new session starts — every prior year&apos;s records stay browsable on the Exams
        and Academic Records pages.
      </p>

      <div className="space-y-2 mb-4">
        {years.map((y) => (
          <div
            key={y.id}
            className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays size={15} className="text-text-2" />
              <div>
                <div className="text-[13.5px] font-medium">{y.name}</div>
                {(y.starts_on || y.ends_on) && (
                  <div className="text-[11.5px] text-text-2">
                    {y.starts_on ? formatDate(y.starts_on) : "—"} → {y.ends_on ? formatDate(y.ends_on) : "—"}
                  </div>
                )}
              </div>
            </div>
            {y.is_current ? (
              <Badge tone="green">Current</Badge>
            ) : (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => makeCurrent(y)}>
                Make current
              </Button>
            )}
          </div>
        ))}
        {years.length === 0 && (
          <p className="text-[12.5px] text-text-2">No academic years yet — add one below.</p>
        )}
      </div>

      {adding ? (
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="year_name">Name</Label>
            <Input id="year_name" name="name" placeholder="e.g. 2026-2027" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year_starts">Starts</Label>
              <Input id="year_starts" name="starts_on" type="date" />
            </div>
            <div>
              <Label htmlFor="year_ends">Ends</Label>
              <Input id="year_ends" name="ends_on" type="date" />
            </div>
          </div>
          {state?.error && (
            <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add Year"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={15} /> Add Academic Year
        </Button>
      )}
    </Card>
  );
}
