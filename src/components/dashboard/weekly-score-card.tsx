"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BriefcaseBusiness,
  Dumbbell,
  Languages,
  Brain,
  Code2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { WeeklyScore } from "@/lib/analytics/scores";

const domainMeta = {
  habits: { label: "Habits", icon: Activity },
  languages: { label: "Languages", icon: Languages },
  engineering: { label: "Engineering", icon: Code2 },
  career: { label: "Career", icon: BriefcaseBusiness },
  health: { label: "Health", icon: Dumbbell },
  mindset: { label: "Mindset", icon: Brain },
} as const;

const formatChange = (change: number | null) => {
  if (change === null) return "Week-to-date snapshot · not a like-for-like weekly trend";
  if (change === 0) return "No change";
  return `${change > 0 ? "+" : ""}${change} vs last week`;
};

export function WeeklyScoreCard({ score }: { score: WeeklyScore }) {
  const overall = score.overall;
  const changeClass =
    score.change === null
      ? "text-text-tertiary"
      : score.change >= 0
        ? "text-success"
        : "text-danger";

  return (
    <Card>
      <CardHeader
        eyebrow="This Week"
        title="Weekly Score"
        action={
          <span className="text-[11px] text-text-tertiary">
            {score.availableWeight * 100}% tracked
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
        <div>
          <div className="font-display text-5xl font-bold tracking-tight text-text-primary">
            {overall === null ? "—" : overall.toFixed(1)}
          </div>
          <p className={`text-xs mt-2 ${changeClass}`}>
            {formatChange(score.change)}
          </p>
        </div>

        <div className="space-y-3">
          {(Object.keys(domainMeta) as Array<keyof typeof domainMeta>).map(
            (key, index) => {
              const domain = score.domains[key];
              const meta = domainMeta[key];
              const Icon = meta.icon;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="grid grid-cols-[24px_1fr_auto] gap-3 items-center"
                >
                  <Icon className="h-4 w-4 text-accent-blue-soft" />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-xs text-text-secondary">
                        {meta.label}{key === "engineering" ? " · current snapshot" : ""}
                      </span>
                      <span className="text-xs font-medium text-text-primary">
                        {domain.score === null ? "—" : domain.score}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-blue-soft transition-all"
                        style={{
                          width: `${domain.score ?? 0}%`,
                          opacity: domain.available ? 1 : 0.2,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-text-tertiary">
                    {Math.round(domain.weight * 100)}%
                  </span>
                </motion.div>
              );
            },
          )}
        </div>
      </div>
    </Card>
  );
}
