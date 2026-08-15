import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  Dumbbell,
  Languages,
  Brain,
  ListChecks,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { WeeklyPriority, WeeklyPlan } from "@/lib/analytics/planning";

const domainMeta: Record<
  WeeklyPriority["domain"],
  { label: string; icon: typeof ListChecks }
> = {
  habits: { label: "Habits", icon: ListChecks },
  languages: { label: "Languages", icon: Languages },
  engineering: { label: "Engineering", icon: Code2 },
  career: { label: "Career", icon: BriefcaseBusiness },
  health: { label: "Health", icon: Dumbbell },
  mindset: { label: "Mindset", icon: Brain },
};

const priorityMeta = {
  high: {
    label: "HIGH",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  medium: {
    label: "MEDIUM",
    className: "border-white/10 bg-white/5 text-text-secondary",
  },
  low: {
    label: "LOW",
    className: "border-white/10 bg-white/5 text-text-tertiary",
  },
} as const;

export function WeeklyPriorities({ plan }: { plan: WeeklyPlan }) {
  return (
    <Card>
      <CardHeader
        eyebrow="This Week"
        title="Priorities"
        action={
          <span className="text-[11px] text-text-tertiary">
            {plan.priorities.length} focused areas
          </span>
        }
      />

      {plan.priorities.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs leading-5 text-text-secondary">
            No actionable priorities have been generated for this week yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plan.priorities.map((priority) => {
            const meta = domainMeta[priority.domain];
            const Icon = meta.icon;
            const badge = priorityMeta[priority.priority];

            return (
              <article
                key={priority.insightId}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                    <Icon className="h-4 w-4 text-text-secondary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold tracking-wider text-text-tertiary">
                        {String(priority.rank).padStart(2, "0")}
                      </span>

                      <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                        {meta.label}
                      </span>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <h4 className="mt-1 text-sm font-medium text-text-primary">
                      {priority.title}
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {priority.reason}
                    </p>

                    {priority.action && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                        <p className="text-[11px] leading-5 text-text-secondary">
                          {priority.action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
