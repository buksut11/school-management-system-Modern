"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadAvatar } from "@/lib/supabase/upload";
import { Avatar } from "@/components/ui/avatar";

export function PhotoPicker({
  name,
  folder,
  initialUrl,
  displayName,
}: {
  name: string;
  folder: "students" | "teachers";
  initialUrl?: string | null;
  displayName: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const publicUrl = await uploadAvatar(file, folder);
      setUrl(publicUrl);
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-16 h-16 rounded-full overflow-hidden group flex-none"
      >
        <Avatar name={displayName || "?"} photoUrl={url || null} size={64} className="w-16 h-16" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          {busy ? (
            <Loader2 size={18} className="animate-spin text-white" />
          ) : (
            <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </button>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[13px] font-medium text-blue hover:underline"
        >
          {url ? "Change photo" : "Upload photo"}
        </button>
        {error && <p className="text-[12px] text-red mt-0.5">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
