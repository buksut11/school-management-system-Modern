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

export async function bulkImportStudents(rows: ImportStudentRow[]) {
  const validRows = rows.filter((r) => r.full_name?.trim());
  if (validRows.length === 0) return { error: "No valid rows to import (a name is required)." };

  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("id, name");
  const classByName = new Map((classes ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));

  const records = validRows.map((r) => {
    const gender = r.gender?.trim().toLowerCase();
    return {
      full_name: r.full_name.trim(),
      class_id: r.class_name ? classByName.get(r.class_name.trim().toLowerCase()) ?? null : null,
      gender: (gender === "male" || gender === "female" ? gender : null) as Gender | null,
      dob: r.dob?.trim() || null,
      address: r.address?.trim() || null,
      mobile: r.mobile?.trim() || null,
      parent_mobile: r.parent_mobile?.trim() || null,
      base_fees: Number(r.base_fees) || 0,
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
