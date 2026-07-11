import { createClient } from "@/lib/supabase/client";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB — matches the storage bucket's file_size_limit

export async function uploadAvatar(file: File, folder: "students" | "teachers") {
  // Trust the browser-reported MIME type, not the filename extension a user
  // typed — an attacker can name an .html/.svg file "photo.jpg" freely.
  // The storage bucket enforces the same allowlist server-side; this just
  // fails fast with a clear message instead of a generic upload error.
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Please upload a JPG, PNG, or WEBP image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large — please keep it under 5MB.");
  }

  const supabase = createClient();

  // Objects live under a per-school prefix; storage policies (0020) only
  // allow writes inside the caller's own school folder.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();
  if (!profile?.school_id) throw new Error("Join or create a school before uploading photos.");

  const path = `${profile.school_id}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
