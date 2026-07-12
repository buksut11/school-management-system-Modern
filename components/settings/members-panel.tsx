"use client";

import { useState, useTransition } from "react";
import { UserMinus, ShieldCheck, RefreshCw, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import {
  rotateJoinCode,
  setMemberRole,
  removeMember,
  linkMemberTeacher,
  linkMemberStudents,
} from "@/lib/actions/members";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/utils";
import type { Member, PersonOption } from "@/lib/data/members";
import type { AssignableRole, Role } from "@/lib/types/database";

const ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "finance", label: "Finance" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
];

const ROLE_TONE: Record<Role, "blue" | "gray" | "green" | "purple" | "teal" | "orange"> = {
  admin: "blue",
  staff: "gray",
  finance: "green",
  teacher: "purple",
  student: "teal",
  parent: "teal",
  pending: "orange",
};

export function MembersPanel({
  members,
  currentUserId,
  isAdmin,
  students,
  teachers,
}: {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  students: PersonOption[];
  teachers: PersonOption[];
}) {
  const [busy, startTransition] = useTransition();
  const [rotating, setRotating] = useState(false);
  const { show } = useToast();
  const confirm = useConfirm();

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Unknown";

  function changeRole(m: Member, role: AssignableRole) {
    if (role === m.role) return;
    startTransition(async () => {
      const result = await setMemberRole(m.id, role, m.full_name || "Member");
      show(result.error ?? `${m.full_name || "Member"} is now ${role}`);
    });
  }

  function changeTeacherLink(m: Member, teacherId: string) {
    startTransition(async () => {
      const result = await linkMemberTeacher(m.id, teacherId || null, m.full_name || "Member");
      show(result.error ?? "Teacher record linked");
    });
  }

  function addChild(m: Member, studentId: string) {
    if (!studentId || m.student_ids.includes(studentId)) return;
    startTransition(async () => {
      const result = await linkMemberStudents(
        m.id,
        [...m.student_ids, studentId],
        m.full_name || "Member"
      );
      show(result.error ?? `Linked to ${studentName(studentId)}`);
    });
  }

  function removeChild(m: Member, studentId: string) {
    startTransition(async () => {
      const result = await linkMemberStudents(
        m.id,
        m.student_ids.filter((id) => id !== studentId),
        m.full_name || "Member"
      );
      show(result.error ?? "Link removed");
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
      title: "Rotate the invite links?",
      message:
        "The current staff invite link and join code stop working immediately. Anyone you still want to invite needs the new link.",
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
        Admins run everything; staff handle daily records and take fee payments; finance manages
        all money including expenses; teachers mark attendance and grades for their own class;
        students and parents see only their own records. New family-link joiners appear as{" "}
        <span className="text-orange font-medium">pending</span> until you assign them.
      </p>

      <div className="space-y-2 mb-4">
        {members.map((m) => (
          <div key={m.id} className="rounded-xl border border-line px-3.5 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">
                  {m.full_name || "Unnamed account"}
                  {m.id === currentUserId && (
                    <span className="text-text-2 font-normal"> (you)</span>
                  )}
                </div>
                <div className="text-[11.5px] text-text-2">Joined {formatDate(m.created_at)}</div>
              </div>
              {isAdmin && m.id !== currentUserId ? (
                <div className="flex items-center gap-1.5 flex-none">
                  {m.role === "pending" && <Badge tone="orange">pending</Badge>}
                  <Select
                    value={m.role === "pending" ? "" : m.role}
                    disabled={busy}
                    onChange={(e) => changeRole(m, e.target.value as AssignableRole)}
                    className="w-auto h-8 text-[12.5px]"
                    aria-label={`Role for ${m.full_name}`}
                  >
                    {m.role === "pending" && <option value="">Assign role…</option>}
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
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
                <Badge tone={ROLE_TONE[m.role]}>
                  {m.role === "admin" && <ShieldCheck size={12} />} {m.role}
                </Badge>
              )}
            </div>

            {isAdmin && m.role === "teacher" && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-2 flex-none">Teacher record:</span>
                <Select
                  value={m.teacher_id ?? ""}
                  disabled={busy}
                  onChange={(e) => changeTeacherLink(m, e.target.value)}
                  className="w-auto h-8 text-[12.5px]"
                  aria-label={`Teacher record for ${m.full_name}`}
                >
                  <option value="">— not linked (no class access) —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {isAdmin && (m.role === "student" || m.role === "parent") && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] text-text-2 flex-none">
                  {m.role === "parent" ? "Children:" : "Student record:"}
                </span>
                {m.student_ids.map((sid) => (
                  <span
                    key={sid}
                    className="inline-flex items-center gap-1 rounded-full bg-teal/10 text-teal px-2.5 py-1 text-[12px] font-medium"
                  >
                    {studentName(sid)}
                    <button
                      onClick={() => removeChild(m, sid)}
                      disabled={busy}
                      aria-label={`Unlink ${studentName(sid)}`}
                      className="hover:text-red transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {(m.role === "parent" || m.student_ids.length === 0) && (
                  <Select
                    value=""
                    disabled={busy}
                    onChange={(e) => addChild(m, e.target.value)}
                    className="w-auto h-8 text-[12.5px]"
                    aria-label={`Link a student to ${m.full_name}`}
                  >
                    <option value="">Link a student…</option>
                    {students
                      .filter((s) => !m.student_ids.includes(s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                  </Select>
                )}
                {m.student_ids.length === 0 && (
                  <span className="text-[11.5px] text-orange">sees nothing until linked</span>
                )}
              </div>
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
