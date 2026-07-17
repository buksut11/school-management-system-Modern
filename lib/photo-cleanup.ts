import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { isPhotoPath } from "@/lib/utils";

// Best-effort removal of an avatar object that no longer backs any row —
// a replaced photo, or the photo of a deleted person. Without this the
// bucket accumulates orphaned images of children forever (audit 2.3).
// Storage policies restrict deletes to staff of the owning school, and a
// failure here (object already gone, policy denied) must never block the
// save that triggered it.
export async function removeReplacedPhoto(
  supabase: SupabaseClient<Database>,
  oldPath: string | null | undefined,
  newPath: string | null
) {
  if (isPhotoPath(oldPath ?? null) && oldPath !== newPath) {
    await supabase.storage.from("avatars").remove([oldPath as string]);
  }
}
