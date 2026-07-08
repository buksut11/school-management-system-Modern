import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "orange" | "red" | "purple" | "teal" | "gray";

const tones: Record<Tone, string> = {
  blue: "bg-blue-soft text-blue",
  green: "bg-green/10 text-green",
  orange: "bg-orange/10 text-orange",
  red: "bg-red/10 text-red",
  purple: "bg-purple/10 text-purple",
  teal: "bg-teal/10 text-teal",
  gray: "bg-card-2 text-text-2",
};

export function Badge({
  tone = "gray",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
