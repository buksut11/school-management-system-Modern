"use client";

import { useActionState, useState } from "react";
import { School, KeyRound, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { createSchool, joinSchool } from "@/lib/actions/school";
import { logout } from "@/lib/actions/auth";

export function SchoolOnboarding({ fullName }: { fullName: string }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [createState, createAction, creating] = useActionState(createSchool, undefined);
  const [joinState, joinAction, joining] = useActionState(joinSchool, undefined);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-md">
        <h1 className="text-[18px] font-semibold tracking-tight mb-1">
          Welcome{fullName ? `, ${fullName}` : ""}
        </h1>
        <p className="text-[13px] text-text-2 mb-4">
          Your account isn&apos;t part of a school yet. Create your school to get started, or join
          an existing one with the code your admin shared.
        </p>

        <Segmented
          value={mode}
          onChange={setMode}
          className="mb-4"
          options={[
            { value: "create", label: "Create a school" },
            { value: "join", label: "Join with a code" },
          ]}
        />

        {mode === "create" ? (
          <form action={createAction} className="space-y-3">
            <div>
              <Label htmlFor="school_name">School name</Label>
              <Input id="school_name" name="name" placeholder="e.g. Sh.Asharow Primary & Secondary" required />
            </div>
            {createState?.error && (
              <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{createState.error}</p>
            )}
            <Button type="submit" disabled={creating} className="w-full">
              <School size={15} /> {creating ? "Creating…" : "Create school"}
            </Button>
            <p className="text-[12px] text-text-2">
              You&apos;ll be the school&apos;s admin and get a join code to invite your staff.
            </p>
          </form>
        ) : (
          <form action={joinAction} className="space-y-3">
            <div>
              <Label htmlFor="join_code">Join code</Label>
              <Input id="join_code" name="code" placeholder="e.g. 3fa92c1b04d7" required />
            </div>
            {joinState?.error && (
              <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{joinState.error}</p>
            )}
            <Button type="submit" disabled={joining} className="w-full">
              <KeyRound size={15} /> {joining ? "Joining…" : "Join school"}
            </Button>
          </form>
        )}

        <button
          onClick={() => logout()}
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </Card>
    </div>
  );
}
