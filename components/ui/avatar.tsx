import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

const PALETTE = ["#007AFF", "#AF52DE", "#30B0C7", "#FF9500", "#34C759", "#FF3B30"];

function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({
  name,
  photoUrl,
  size = 36,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={cn("rounded-full object-cover flex-none", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold flex-none",
        className
      )}
      style={{
        width: size,
        height: size,
        background: hueFor(name || "?"),
        fontSize: size * 0.38,
      }}
    >
      {initials(name || "?")}
    </div>
  );
}
