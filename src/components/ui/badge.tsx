import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  neutral: "bg-white/5 text-text-secondary border-white/10",
  blue: "bg-accent-blue/10 text-accent-blue-soft border-accent-blue/25",
  purple: "bg-accent-purple/10 text-[#c3adff] border-accent-purple/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
