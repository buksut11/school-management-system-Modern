"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { renameSchool } from "@/lib/actions/school";
import { useToast } from "@/components/ui/toast";
import type { School } from "@/lib/types/database";

export function SchoolPanel({ school }: { school: School }) {
  const [state, formAction, pending] = useActionState(renameSchool, undefined);
  const [copied, setCopied] = useState<"code" | "link" | "family" | null>(null);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show("School name updated");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function copy(kind: "code" | "link" | "family") {
    const value =
      kind === "link"
        ? `${window.location.origin}/join/${school.join_code}`
        : kind === "family"
          ? `${window.location.origin}/join/${school.family_join_code}`
          : school.join_code;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">School</h3>
      <p className="text-[12.5px] text-text-2 mb-4">
        Share the join code with new staff — they enter it after signing up and are added to this
        school as staff members.
      </p>

      <form action={formAction} className="space-y-3 mb-4">
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

      <Label>Invite staff</Label>
      <div className="space-y-2 mb-4">
        <Button type="button" variant="secondary" className="w-full" onClick={() => copy("link")}>
          {copied === "link" ? <Check size={15} className="text-green" /> : <Link2 size={15} />}
          {copied === "link" ? "Staff link copied" : "Copy staff invite link"}
        </Button>
        <p className="text-[12px] text-text-2">
          Staff who open it are added with day-to-day access. Prefer a code? They can also enter{" "}
          <button
            type="button"
            onClick={() => copy("code")}
            className="font-mono text-text hover:text-blue transition-colors"
            title="Copy join code"
          >
            {copied === "code" ? "copied!" : school.join_code}
          </button>{" "}
          on the join screen.
        </p>
      </div>

      <Label>Invite students &amp; parents</Label>
      <div className="space-y-2">
        <Button type="button" variant="secondary" className="w-full" onClick={() => copy("family")}>
          {copied === "family" ? <Check size={15} className="text-green" /> : <Link2 size={15} />}
          {copied === "family" ? "Family link copied" : "Copy family invite link"}
        </Button>
        <p className="text-[12px] text-text-2">
          Families who open it join as <span className="text-orange font-medium">pending</span>{" "}
          and see nothing until you assign them Student or Parent in Members and link their child
          record — safe to share widely.
        </p>
      </div>
    </Card>
  );
}
