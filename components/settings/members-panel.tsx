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
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Member, PersonOption } from "@/lib/data/members";
import type { AssignableRole, Invite, Role } from "@/lib/types/database";

type InvitableRole = Exclude<AssignableRole, "admin">;

const ROLE_OPTIONS: { value: AssignableRole; labelKey: MessageKey }[] = [
  { value: "admin", labelKey: "role.admin" },
  { value: "staff", labelKey: "role.staff" },
  { value: "finance", labelKey: "role.finance" },
  { value: "teacher", labelKey: "role.teacher" },
  { value: "student", labelKey: "role.student" },
  { value: "parent", labelKey: "role.parent" },
];

const ROLE_KEY: Record<Role, MessageKey> = {
  admin: "role.admin",
  staff: "role.staff",
  finance: "role.finance",
  teacher: "role.teacher",
  student: "role.student",
  parent: "role.parent",
  pending: "role.pending",
};

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
  const t = useT();

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
      show(t("set.inviteCreated"));
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
      show(result.error ?? t("set.inviteRevoked"));
    });
  }

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? t("set.unknown");

  function changeRole(m: Member, role: AssignableRole) {
    if (role === m.role) return;
    startTransition(async () => {
      const result = await setMemberRole(m.id, role, m.full_name || t("set.memberFallback"));
      show(result.error ?? t("set.roleNow", { name: m.full_name || t("set.memberFallback"), role: t(ROLE_KEY[role]) }));
    });
  }

  function changeTeacherLink(m: Member, teacherId: string) {
    startTransition(async () => {
      const result = await linkMemberTeacher(m.id, teacherId || null, m.full_name || t("set.memberFallback"));
      show(result.error ?? t("set.teacherLinked"));
    });
  }

  function addChild(m: Member, studentId: string) {
    if (!studentId || m.student_ids.includes(studentId)) return;
    startTransition(async () => {
      const result = await linkMemberStudents(
        m.id,
        [...m.student_ids, studentId],
        m.full_name || t("set.memberFallback")
      );
      show(result.error ?? t("set.linkedTo", { name: studentName(studentId) }));
    });
  }

  function removeChild(m: Member, studentId: string) {
    startTransition(async () => {
      const result = await linkMemberStudents(
        m.id,
        m.student_ids.filter((id) => id !== studentId),
        m.full_name || t("set.memberFallback")
      );
      show(result.error ?? t("set.linkRemoved"));
    });
  }

  async function onRemove(m: Member) {
    const ok = await confirm({
      title: t("set.removeMemberTitle", { name: m.full_name || t("set.thisMember") }),
      message: t("set.removeMemberMsg"),
      confirmLabel: t("set.remove"),
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await removeMember(m.id, m.full_name || t("set.memberFallback"));
      show(result.error ?? t("set.memberRemoved"));
    });
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.members")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.membersDesc")}</p>

      <div className="space-y-2 mb-4">
        {members.map((m) => (
          <div key={m.id} className="rounded-xl border border-line px-3.5 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">
                  {m.full_name || t("set.unnamedAccount")}
                  {m.id === currentUserId && (
                    <span className="text-text-2 font-normal"> {t("set.you")}</span>
                  )}
                </div>
                <div className="text-[11.5px] text-text-2">{t("set.joined", { date: formatDate(m.created_at) })}</div>
              </div>
              {isAdmin && m.id !== currentUserId ? (
                <div className="flex items-center gap-1.5 flex-none">
                  {m.role === "pending" && <Badge tone="orange">{t("role.pending")}</Badge>}
                  <Select
                    value={m.role === "pending" ? "" : m.role}
                    disabled={busy}
                    onChange={(e) => changeRole(m, e.target.value as AssignableRole)}
                    className="w-auto h-8 text-[12.5px]"
                    aria-label={t("set.roleForAria", { name: m.full_name })}
                  >
                    {m.role === "pending" && <option value="">{t("set.assignRole")}</option>}
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {t(r.labelKey)}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={() => onRemove(m)}
                    disabled={busy}
                    className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                    aria-label={t("set.removeMemberAria", { name: m.full_name })}
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
              ) : (
                <Badge tone={ROLE_TONE[m.role]}>
                  {m.role === "admin" && <ShieldCheck size={12} />} {t(ROLE_KEY[m.role])}
                </Badge>
              )}
            </div>

            {isAdmin && m.role === "teacher" && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-2 flex-none">{t("set.teacherRecord")}</span>
                <Select
                  value={m.teacher_id ?? ""}
                  disabled={busy}
                  onChange={(e) => changeTeacherLink(m, e.target.value)}
                  className="w-auto h-8 text-[12.5px]"
                  aria-label={t("set.teacherRecordAria", { name: m.full_name })}
                >
                  <option value="">{t("set.notLinkedNoClass")}</option>
                  {teachers.map((tchr) => (
                    <option key={tchr.id} value={tchr.id}>
                      {tchr.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {isAdmin && (m.role === "student" || m.role === "parent") && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] text-text-2 flex-none">
                  {m.role === "parent" ? t("set.children") : t("set.studentRecord")}
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
                      aria-label={t("set.unlinkAria", { name: studentName(sid) })}
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
                    aria-label={t("set.linkStudentToAria", { name: m.full_name })}
                  >
                    <option value="">{t("set.linkStudentOpt")}</option>
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
                  <span className="text-[11.5px] text-orange">{t("set.seesNothing")}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && invites.length > 0 && (
        <div className="mb-4">
          <div className="text-[12px] font-semibold text-text-2 uppercase tracking-wide mb-2">
            {t("set.openInvites")}
          </div>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-line px-3.5 py-2"
              >
                <div className="min-w-0 text-[12.5px]">
                  <span className="font-medium">{t(ROLE_KEY[inv.role])}</span>
                  {inv.email && <span className="text-text-2"> · {inv.email}</span>}
                  <span className="text-text-2"> · {t("set.expires", { date: formatDate(inv.expires_at) })}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  <Button variant="secondary" size="sm" onClick={() => copyInviteLink(inv.code)}>
                    {copiedCode === inv.code ? (
                      <Check size={14} className="text-green" />
                    ) : (
                      <Link2 size={14} />
                    )}
                    {copiedCode === inv.code ? t("set.copied") : t("set.copyLink")}
                  </Button>
                  <button
                    onClick={() => onRevoke(inv)}
                    disabled={busy}
                    className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                    aria-label={t("set.revokeAria")}
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
                aria-label={t("set.inviteRoleAria")}
              >
                <option value="staff">{t("role.staff")}</option>
                <option value="finance">{t("role.finance")}</option>
                <option value="teacher">{t("role.teacher")}</option>
                <option value="student">{t("role.student")}</option>
                <option value="parent">{t("role.parent")}</option>
              </Select>
              {invRole === "teacher" && (
                <Select
                  value={invTeacher}
                  onChange={(e) => setInvTeacher(e.target.value)}
                  className="w-auto h-9 text-[13px]"
                  aria-label={t("set.teacherRecordSelAria")}
                >
                  <option value="">{t("set.whichTeacher")}</option>
                  {teachers.map((tchr) => (
                    <option key={tchr.id} value={tchr.id}>
                      {tchr.full_name}
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
                  aria-label={t("set.linkStudentSelAria")}
                >
                  <option value="">
                    {invRole === "parent" ? t("set.addChild") : t("set.whichStudent")}
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
                    {students.find((s) => s.id === sid)?.full_name ?? t("set.unknown")}
                    <button
                      onClick={() => setInvStudents(invStudents.filter((id) => id !== sid))}
                      aria-label={t("set.remove")}
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
              placeholder={t("set.lockEmail")}
            />
            <div className="flex gap-2">
              <Button onClick={onCreateInvite} disabled={creating}>
                {creating ? t("set.creating") : t("set.createCopyLink")}
              </Button>
              <Button variant="secondary" onClick={() => setInviting(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setInviting(true)}>
            <UserPlus size={15} /> {t("set.inviteSomeone")}
          </Button>
        ))}
    </Card>
  );
}
