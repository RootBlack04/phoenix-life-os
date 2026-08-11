"use client";
import { motion } from "framer-motion";
import {
  Target,
  Gauge,
  Clock,
  CheckCircle2,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { KpiMetric } from "@/types";
const icons = { Target, Gauge, Clock, CheckCircle2, CalendarCheck, TrendingUp };
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const safe =
    points.length > 1 ? points : [0, ...(points.length ? points : [0])];
  const max = Math.max(...safe),
    min = Math.min(...safe),
    range = max - min || 1,
    w = 60,
    h = 24,
    step = w / (safe.length - 1);
  const d = safe
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${i * step} ${h - ((p - min) / range) * h}`,
    )
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function KpiGrid({ kpis }: { kpis: KpiMetric[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((k, i) => {
        const Icon = icons[k.icon as keyof typeof icons] ?? Target;
        const numeric = parseInt(k.value.replace(/[^\d]/g, ""), 10) || 0;
        const pure = /^\d+$/.test(k.value);
        return (
          <motion.div
            key={k.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Card className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-accent-blue-soft" />
                </div>
                <Sparkline points={k.trend} color="var(--accent-blue-soft)" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
                  {k.label}
                </p>
                <p className="font-display text-2xl font-bold text-text-primary mt-0.5">
                  {pure ? <AnimatedCounter value={numeric} /> : k.value}
                  {k.unit && (
                    <span className="text-sm text-text-tertiary ml-1">
                      {k.unit}
                    </span>
                  )}
                </p>
              </div>
              <p className="text-[11px] text-success">{k.deltaLabel}</p>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
