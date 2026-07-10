"use client";

import { Input, Label, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import type { PartyType } from "@/lib/types/database";
import type { StudentOption } from "@/lib/data/invoices";

export type TeacherOption = { id: string; full_name: string };

export type PartyState = {
  type: PartyType;
  id: string | null;
  name: string;
  detail: string;
};

export const EMPTY_PARTY: PartyState = { type: "student", id: null, name: "", detail: "" };

/**
 * Who the invoice/receipt is for. Students and teachers are picked from
 * their lists; other staff (cleaner, watchman, cook, …) are entered by
 * name + role. Emits the resolved party as hidden form fields.
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
              if (!s) return onChange({ ...party, id: null, name: "", detail: "" });
              onChange({ ...party, id: s.id, name: s.full_name, detail: s.class_name ?? "" });
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
              if (!t) return onChange({ ...party, id: null, name: "", detail: "" });
              onChange({ ...party, id: t.id, name: t.full_name, detail: "Teacher" });
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

      <input type="hidden" name="party_type" value={party.type} />
      <input type="hidden" name="party_id" value={party.id ?? ""} />
      <input type="hidden" name="party_name" value={party.name} />
      <input type="hidden" name="party_detail" value={party.detail} />
    </div>
  );
}
