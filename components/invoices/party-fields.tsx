"use client";

import { Input, Label, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import type { PartyType } from "@/lib/types/database";
import type { StudentOption, TeacherOption } from "@/lib/data/invoices";

export type { TeacherOption };

export type PartyState = {
  type: PartyType;
  id: string | null;
  name: string;
  detail: string;
  phone: string;
  address: string;
  parentName: string;
  parentPhone: string;
};

export const EMPTY_PARTY: PartyState = {
  type: "student",
  id: null,
  name: "",
  detail: "",
  phone: "",
  address: "",
  parentName: "",
  parentPhone: "",
};

/**
 * Who the invoice/receipt is for. Students and teachers are picked from
 * their lists (their phone/address auto-fill and stay editable); other
 * staff (cleaner, watchman, cook, …) are entered by hand. Parent/guardian
 * details apply to students only. Everything is emitted as hidden form
 * fields so it gets snapshotted onto the document.
 */
export function PartyFields({
  party,
  onChange,
  students,
  teachers,
  onStudentPick,
}: {
  party: PartyState;
  onChange: (p: PartyState) => void;
  students: StudentOption[];
  teachers: TeacherOption[];
  onStudentPick?: (s: StudentOption) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Who is this for?</Label>
        <Segmented
          value={party.type}
          onChange={(type) => onChange({ ...EMPTY_PARTY, type: type as PartyType })}
          options={[
            { value: "student", label: "Student" },
            { value: "teacher", label: "Teacher" },
            { value: "staff", label: "Other staff" },
          ]}
        />
      </div>

      {party.type === "student" && (
        <div>
          <Label htmlFor="party-student">Student</Label>
          <Select
            id="party-student"
            value={party.id ?? ""}
            onChange={(e) => {
              const s = students.find((x) => x.id === e.target.value);
              if (!s) return onChange({ ...EMPTY_PARTY, type: "student" });
              onChange({
                ...party,
                id: s.id,
                name: s.full_name,
                detail: s.class_name ?? "",
                phone: s.mobile ?? "",
                address: s.address ?? "",
                parentPhone: s.parent_mobile ?? "",
              });
              onStudentPick?.(s);
            }}
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.class_name ? ` · ${s.class_name}` : ""}
              </option>
            ))}
          </Select>
        </div>
      )}

      {party.type === "teacher" && (
        <div>
          <Label htmlFor="party-teacher">Teacher</Label>
          <Select
            id="party-teacher"
            value={party.id ?? ""}
            onChange={(e) => {
              const t = teachers.find((x) => x.id === e.target.value);
              if (!t) return onChange({ ...EMPTY_PARTY, type: "teacher" });
              onChange({
                ...party,
                id: t.id,
                name: t.full_name,
                detail: "Teacher",
                phone: t.mobile ?? "",
                address: t.address ?? "",
              });
            }}
          >
            <option value="">Select a teacher…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {party.type === "staff" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="party-name">Name</Label>
            <Input
              id="party-name"
              value={party.name}
              onChange={(e) => onChange({ ...party, name: e.target.value })}
              placeholder="e.g. Abdi Hassan"
              required
            />
          </div>
          <div>
            <Label htmlFor="party-role">Role</Label>
            <Input
              id="party-role"
              value={party.detail}
              onChange={(e) => onChange({ ...party, detail: e.target.value })}
              placeholder="e.g. Cleaner, Watchman"
            />
          </div>
        </div>
      )}

      {/* Contact details — auto-filled for students/teachers, editable for
          everyone. Shown once a party is chosen (or always, for staff). */}
      {(party.type === "staff" || party.id) && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="party-phone">Phone</Label>
            <Input
              id="party-phone"
              value={party.phone}
              onChange={(e) => onChange({ ...party, phone: e.target.value })}
              placeholder="e.g. +252 61 000 0000"
            />
          </div>
          <div>
            <Label htmlFor="party-address">Address</Label>
            <Input
              id="party-address"
              value={party.address}
              onChange={(e) => onChange({ ...party, address: e.target.value })}
              placeholder="e.g. Hodan District, Mogadishu"
            />
          </div>
        </div>
      )}

      {/* Parent / guardian — students only. */}
      {party.type === "student" && party.id && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="parent-name">Parent / guardian</Label>
            <Input
              id="parent-name"
              value={party.parentName}
              onChange={(e) => onChange({ ...party, parentName: e.target.value })}
              placeholder="e.g. Mother — Fadumo Ali"
            />
          </div>
          <div>
            <Label htmlFor="parent-phone">Parent phone</Label>
            <Input
              id="parent-phone"
              value={party.parentPhone}
              onChange={(e) => onChange({ ...party, parentPhone: e.target.value })}
              placeholder="e.g. +252 61 000 0000"
            />
          </div>
        </div>
      )}

      <input type="hidden" name="party_type" value={party.type} />
      <input type="hidden" name="party_id" value={party.id ?? ""} />
      <input type="hidden" name="party_name" value={party.name} />
      <input type="hidden" name="party_detail" value={party.detail} />
      <input type="hidden" name="party_phone" value={party.phone} />
      <input type="hidden" name="party_address" value={party.address} />
      <input type="hidden" name="parent_name" value={party.parentName} />
      <input type="hidden" name="parent_phone" value={party.parentPhone} />
    </div>
  );
}
