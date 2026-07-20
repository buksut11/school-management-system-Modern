import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Only allow same-origin relative paths for post-auth redirects.
// "//evil.com" and "/\evil.com" both pass a naive startsWith("/") check
// but browsers treat them as protocol-relative absolute URLs.
export function safeNext(next: string) {
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}

// A bare avatars-bucket storage path: <school uuid>/students|teachers/<file>.
// This is what photo_url columns store since the bucket went private
// (migration 0034) — display URLs are short-lived signatures minted from
// the path at read time.
const PHOTO_PATH_RE = /^[0-9a-f-]{36}\/(students|teachers)\/[^/?#]+$/i;

export function isPhotoPath(value: string | null): value is string {
  return !!value && PHOTO_PATH_RE.test(value);
}

// Normalize whatever a form posted back into a storable path, or null.
// Forms legitimately hold three shapes: the bare path, a signed display
// URL (what the data layer/upload helper hands out), or a legacy public
// URL from before 0034. Anything else — an external URL a crafted
// request tried to plant — is dropped.
export function normalizePhotoPath(value: string | null): string | null {
  if (!value) return null;
  if (PHOTO_PATH_RE.test(value)) return value;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  for (const kind of ["sign", "public"]) {
    const prefix = `${base.replace(/\/$/, "")}/storage/v1/object/${kind}/avatars/`;
    if (value.startsWith(prefix)) {
      const path = value.slice(prefix.length).split("?")[0];
      return PHOTO_PATH_RE.test(path) ? path : null;
    }
  }
  return null;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function relativeTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return "Just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;
  return formatDate(d);
}
