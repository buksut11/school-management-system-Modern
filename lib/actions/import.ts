"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { Gender } from "@/lib/types/database";

export type ImportStudentRow = {
  full_name: string;
  class_name?: string;
  gender?: string;
  dob?: string;
  address?: string;
  mobile?: string;
  parent_mobile?: string;
  base_fees?: string;
};

const MAX_IMPORT_ROWS = 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function bulkImportStudents(rows: ImportStudentRow[]) {
  const validRows = rows.filter((r) => r.full_name?.trim());
  if (validRows.length === 0) return { error: "No valid rows to import (a name is required)." };
  if (validRows.length > MAX_IMPORT_ROWS) {
    return {
      error: `That file has ${validRows.length} rows — imports are capped at ${MAX_IMPORT_ROWS} at a time. Split the file and try again.`,
    };
  }

  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("id, name");
  const classByName = new Map((classes ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));

  const records = validRows.map((r) => {
    const gender = r.gender?.trim().toLowerCase();
    const dob = r.dob?.trim() || "";
    return {
      full_name: r.full_name.trim(),
      class_id: r.class_name ? classByName.get(r.class_name.trim().toLowerCase()) ?? null : null,
      gender: (gender === "male" || gender === "female" ? gender : null) as Gender | null,
      // A malformed date would abort the whole insert with a raw
      // Postgres error — drop it rather than fail 999 good rows.
      dob: ISO_DATE.test(dob) ? dob : null,
      address: r.address?.trim() || null,
      mobile: r.mobile?.trim() || null,
      parent_mobile: r.parent_mobile?.trim() || null,
      base_fees: Math.max(0, Number(r.base_fees) || 0),
    };
  });

  const { error } = await supabase.from("students").insert(records);
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    "import",
    `Imported ${records.length} student record${records.length === 1 ? "" : "s"} from CSV`
  );
  revalidatePath("/", "layout");
  return { success: true, count: records.length };
}
