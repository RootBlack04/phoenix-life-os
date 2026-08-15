import { AlertTriangle, CheckCircle2, CircleHelp, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { WeeklyInsight } from "@/lib/analytics/insights";

const kindMeta = {
  warning: {
    icon: AlertTriangle,
    tone: "text-warning",
    badge: "bg-warning/10 border-warning/20 text-warning",
  },
  positive: {
    icon: CheckCircle2,
    tone: "text-success",
    badge: "bg-success/10 border-success/20 text-success",
  },
  info: {
    icon: Info,
    tone: "text-text-tertiary",
    badge: "bg-white/5 border-white/10 text-text-secondary",
  },
} as const;

const priorityLabel = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "INFO",
} as const;

export function WeeklyInsights({ insights }: { insights: WeeklyInsight[] }) {
  return (
    <Card>
      <CardHeader
        eyebrow="This Week"
        title="Insights"
        action={
          <span className="text-[11px] text-text-tertiary">
            {insights.length} signals
          </span>
        }
      />

      <div className="space-y-3">
        {insights.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <CircleHelp className="h-4 w-4 text-text-tertiary" />
            <p className="text-xs text-text-secondary">
              Not enough weekly data to generate insights yet.
            </p>
          </div>
        ) : (
          insights.map((insight) => {
            const meta = kindMeta[insight.kind];
            const Icon = meta.icon;

            return (
              <div
                key={insight.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-medium text-text-primary">
                        {insight.title}
                      </h4>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide ${meta.badge}`}
                      >
                        {priorityLabel[insight.priority]}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {insight.description}
                    </p>

                    {insight.action && (
                      <div className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2">
                        <p className="text-[11px] text-text-tertiary">
                          <span className="text-text-secondary">Next:</span>{" "}
                          {insight.action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
