import { createClient } from "@/lib/supabase/server";
import { isPhotoPath } from "@/lib/utils";

// The avatars bucket is private (migration 0034): photo_url columns hold
// bare storage paths, and browsers need a short-lived signed URL to
// actually fetch the image. Data-layer list functions pass their rows
// through here right before returning — one batched signing call per
// request, and the storage API checks the caller's own read policy
// (same school, active member) before signing anything.
//
// The TTL only needs to outlive a page view; every server render mints
// fresh URLs.
const SIGN_TTL_SECONDS = 60 * 60;

export async function signPhotoUrls<T extends { photo_url: string | null }>(
  rows: T[]
): Promise<T[]> {
  const paths = [...new Set(rows.map((r) => r.photo_url).filter(isPhotoPath))];
  if (paths.length === 0) return rows;

  const supabase = await createClient();
  const { data } = await supabase.storage.from("avatars").createSignedUrls(paths, SIGN_TTL_SECONDS);

  const byPath = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) byPath.set(item.path, item.signedUrl);
  }
  // Paths that failed to sign (object deleted, policy denied) fall back
  // to null so the Avatar initials placeholder renders instead of a
  // broken image.
  return rows.map((r) => {
    if (!isPhotoPath(r.photo_url)) return r;
    return { ...r, photo_url: byPath.get(r.photo_url) ?? null };
  });
}
