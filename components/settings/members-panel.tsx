"use client";

import { useState, useTransition } from "react";
import { UserMinus, ShieldCheck, UserPlus, Link2, Check, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import {
  createInvite,
  revokeInvite,
  setMemberRole,
  removeMember,
  linkMemberTeacher,
  linkMemberStudents,
} from "@/lib/actions/members";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/utils";
import type { Member, PersonOption } from "@/lib/data/members";
import type { AssignableRole, Invite, Role } from "@/lib/types/database";

type InvitableRole = Exclude<AssignableRole, "admin">;

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
  invites,
  currentUserId,
  isAdmin,
  students,
  teachers,
}: {
  members: Member[];
  invites: Invite[];
  currentUserId: string;
  isAdmin: boolean;
  students: PersonOption[];
  teachers: PersonOption[];
}) {
  const [busy, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

  // invite composer
  const [inviting, setInviting] = useState(false);
  const [invRole, setInvRole] = useState<InvitableRole>("staff");
  const [invEmail, setInvEmail] = useState("");
  const [invTeacher, setInvTeacher] = useState("");
  const [invStudents, setInvStudents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function copyInviteLink(code: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1600);
  }

  async function onCreateInvite() {
    setCreating(true);
    try {
      const result = await createInvite({
        role: invRole,
        email: invEmail.trim() || null,
        teacherId: invRole === "teacher" ? invTeacher || null : null,
        studentIds: invRole === "student" || invRole === "parent" ? invStudents : [],
      });
      if (result.error) {
        show(result.error);
        return;
      }
      if (result.code) await copyInviteLink(result.code);
      show("Invite created — link copied, send it to them");
      setInviting(false);
      setInvEmail("");
      setInvTeacher("");
      setInvStudents([]);
    } finally {
      setCreating(false);
    }
  }

  function onRevoke(inv: Invite) {
    startTransition(async () => {
      const result = await revokeInvite(inv.id);
      show(result.error ?? "Invite revoked — its link no longer works");
    });
  }

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

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">Members</h3>
      <p className="text-[12.5px] text-text-2 mb-4">
        Admins run everything; staff handle daily records and take fee payments; finance manages
        all money including expenses; teachers mark attendance and grades for their own class;
        students and parents see only their own records. Each invite is personal: one link, one
        person, used once — it carries the role (and class or child) you choose here.
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

      {isAdmin && invites.length > 0 && (
        <div className="mb-4">
          <div className="text-[12px] font-semibold text-text-2 uppercase tracking-wide mb-2">
            Open invites
          </div>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-line px-3.5 py-2"
              >
                <div className="min-w-0 text-[12.5px]">
                  <span className="font-medium capitalize">{inv.role}</span>
                  {inv.email && <span className="text-text-2"> · {inv.email}</span>}
                  <span className="text-text-2"> · expires {formatDate(inv.expires_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  <Button variant="secondary" size="sm" onClick={() => copyInviteLink(inv.code)}>
                    {copiedCode === inv.code ? (
                      <Check size={14} className="text-green" />
                    ) : (
                      <Link2 size={14} />
                    )}
                    {copiedCode === inv.code ? "Copied" : "Copy link"}
                  </Button>
                  <button
                    onClick={() => onRevoke(inv)}
                    disabled={busy}
                    className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                    aria-label="Revoke invite"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin &&
        (inviting ? (
          <div className="rounded-xl border border-line p-3.5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={invRole}
                onChange={(e) => setInvRole(e.target.value as InvitableRole)}
                className="w-auto h-9 text-[13px]"
                aria-label="Invite role"
              >
                <option value="staff">Staff</option>
                <option value="finance">Finance</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
              </Select>
              {invRole === "teacher" && (
                <Select
                  value={invTeacher}
                  onChange={(e) => setInvTeacher(e.target.value)}
                  className="w-auto h-9 text-[13px]"
                  aria-label="Teacher record"
                >
                  <option value="">Which teacher record?</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </Select>
              )}
              {(invRole === "student" || invRole === "parent") && (
                <Select
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id && !invStudents.includes(id)) setInvStudents([...invStudents, id]);
                  }}
                  className="w-auto h-9 text-[13px]"
                  aria-label="Link a student"
                >
                  <option value="">
                    {invRole === "parent" ? "Add a child…" : "Which student?"}
                  </option>
                  {students
                    .filter((s) => !invStudents.includes(s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                </Select>
              )}
            </div>
            {invStudents.length > 0 && (invRole === "student" || invRole === "parent") && (
              <div className="flex flex-wrap gap-1.5">
                {invStudents.map((sid) => (
                  <span
                    key={sid}
                    className="inline-flex items-center gap-1 rounded-full bg-teal/10 text-teal px-2.5 py-1 text-[12px] font-medium"
                  >
                    {students.find((s) => s.id === sid)?.full_name ?? "Unknown"}
                    <button
                      onClick={() => setInvStudents(invStudents.filter((id) => id !== sid))}
                      aria-label="Remove"
                      className="hover:text-red transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              type="email"
              placeholder="Lock to an email (optional — only that address can use it)"
            />
            <div className="flex gap-2">
              <Button onClick={onCreateInvite} disabled={creating}>
                {creating ? "Creating…" : "Create & copy link"}
              </Button>
              <Button variant="secondary" onClick={() => setInviting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setInviting(true)}>
            <UserPlus size={15} /> Invite someone
          </Button>
        ))}
    </Card>
  );
}
