import { CheckCircle2, ListChecks, PlayCircle, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { WeeklyMetrics } from "@/lib/analytics/weekly";

type WeeklyExecutionReviewProps = {
  metrics: WeeklyMetrics["current"]["tasks"];
  week: WeeklyMetrics["week"];
};

const metricCards = [
  {
    key: "completed",
    label: "Completed",
    detail: "Finished this week",
    icon: CheckCircle2,
    className: "text-success",
  },
  {
    key: "total",
    label: "Tracked",
    detail: "Tasks in this week",
    icon: ListChecks,
    className: "text-accent-blue-soft",
  },
  {
    key: "inProgress",
    label: "In Progress",
    detail: "Currently active",
    icon: PlayCircle,
    className: "text-warning",
  },
  {
    key: "completionRate",
    label: "Completion Rate",
    detail: "Completed of tracked",
    icon: TrendingUp,
    className: "text-accent-purple",
  },
] as const;

export function WeeklyExecutionReview({
  metrics,
  week,
}: WeeklyExecutionReviewProps) {
  return (
    <Card>
      <CardHeader
        eyebrow="Review"
        title="Weekly Execution"
        action={
          <span className="text-[11px] text-text-tertiary">
            {week.start} → {week.end}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          const value = metrics[metric.key];

          return (
            <div
              key={metric.key}
              className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                  {metric.label}
                </p>
                <Icon className={`h-4 w-4 ${metric.className}`} />
              </div>

              <p className="mt-3 font-display text-2xl font-semibold text-text-primary">
                {value}
                {metric.key === "completionRate" && (
                  <span className="ml-0.5 text-sm text-text-tertiary">%</span>
                )}
              </p>

              <p className="mt-1 text-[10px] text-text-tertiary">
                {metric.detail}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="text-text-secondary">Execution progress</span>
          <span className="font-medium text-text-primary">
            {metrics.completionRate}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-blue to-success transition-all"
            style={{ width: `${metrics.completionRate}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
