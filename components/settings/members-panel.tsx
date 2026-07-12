"use client";

import { useState, useTransition } from "react";
import { UserMinus, ShieldCheck, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { rotateJoinCode, setMemberRole, removeMember } from "@/lib/actions/members";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/utils";
import type { Member } from "@/lib/data/members";

export function MembersPanel({
  members,
  currentUserId,
  isAdmin,
}: {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [busy, startTransition] = useTransition();
  const [rotating, setRotating] = useState(false);
  const { show } = useToast();
  const confirm = useConfirm();

  function changeRole(m: Member, role: "admin" | "staff") {
    if (role === m.role) return;
    startTransition(async () => {
      const result = await setMemberRole(m.id, role, m.full_name || "Member");
      show(result.error ?? `${m.full_name || "Member"} is now ${role}`);
    });
  }

  async function onRemove(m: Member) {
    const ok = await confirm({
      title: `Remove ${m.full_name || "this member"}?`,
      message:
        "They lose access to the school immediately. Everything they recorded stays. They can rejoin with a current invite link.",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await removeMember(m.id, m.full_name || "Member");
      show(result.error ?? "Member removed");
    });
  }

  async function onRotate() {
    const ok = await confirm({
      title: "Rotate the invite link?",
      message:
        "The current invite link and join code stop working immediately. Anyone you still want to invite needs the new link.",
      confirmLabel: "Rotate",
      tone: "primary",
    });
    if (!ok) return;
    setRotating(true);
    try {
      const result = await rotateJoinCode();
      show(result.error ?? "Invite link rotated — copy the new one from the School panel");
    } finally {
      setRotating(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">Members</h3>
      <p className="text-[12.5px] text-text-2 mb-4">
        Everyone with access to this school. Admins manage money, deletes and settings; staff
        handle day-to-day records.
      </p>

      <div className="space-y-2 mb-4">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-line px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium truncate">
                {m.full_name || "Unnamed account"}
                {m.id === currentUserId && <span className="text-text-2 font-normal"> (you)</span>}
              </div>
              <div className="text-[11.5px] text-text-2">Joined {formatDate(m.created_at)}</div>
            </div>
            {isAdmin && m.id !== currentUserId ? (
              <div className="flex items-center gap-1.5 flex-none">
                <Select
                  value={m.role}
                  disabled={busy}
                  onChange={(e) => changeRole(m, e.target.value as "admin" | "staff")}
                  className="w-auto h-8 text-[12.5px]"
                  aria-label={`Role for ${m.full_name}`}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </Select>
                <button
                  onClick={() => onRemove(m)}
                  disabled={busy}
                  className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                  aria-label={`Remove ${m.full_name}`}
                >
                  <UserMinus size={15} />
                </button>
              </div>
            ) : (
              <Badge tone={m.role === "admin" ? "blue" : "gray"}>
                {m.role === "admin" && <ShieldCheck size={12} />} {m.role}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <Button variant="secondary" onClick={onRotate} disabled={rotating}>
          <RefreshCw size={15} /> {rotating ? "Rotating…" : "Rotate invite link"}
        </Button>
      )}
    </Card>
  );
}
