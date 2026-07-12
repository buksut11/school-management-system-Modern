"use client";

import { useActionState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { renameSchool } from "@/lib/actions/school";
import { useToast } from "@/components/ui/toast";
import type { School } from "@/lib/types/database";

export function SchoolPanel({ school }: { school: School }) {
  const [state, formAction, pending] = useActionState(renameSchool, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show("School name updated");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">School</h3>
      <p className="text-[12.5px] text-text-2 mb-4">
        Invites moved to the Members panel below — each one is personal, single-use, and carries
        the role you pick.
      </p>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={school.id} />
        <div>
          <Label htmlFor="school_rename">Name</Label>
          <div className="flex gap-2">
            <Input id="school_rename" name="name" defaultValue={school.name} required />
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
