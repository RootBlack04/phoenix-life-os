"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ProgressBar({
  percent,
  className,
  gradientFrom = "var(--accent-blue)",
  gradientTo = "var(--accent-purple)",
  height = 8,
}: {
  percent: number;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  height?: number;
}) {
  return (
    <div
      className={cn("w-full rounded-full bg-white/5 overflow-hidden", className)}
      style={{ height }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
        }}
      />
    </div>
  );
}
