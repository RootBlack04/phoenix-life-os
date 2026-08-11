import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass glass-hover rounded-2xl p-5",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  action,
  eyebrow,
}: {
  className?: string;
  title: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-wider text-text-tertiary mb-1">
            {eyebrow}
          </p>
        )}
        <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary uppercase">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}
