import "server-only";

import type { WeeklyMetrics } from "@/lib/analytics/weekly";
import type { ScoreDomain, WeeklyScore } from "@/lib/analytics/scores";
import type { WeeklyInsight } from "@/lib/analytics/insights";

export type PlanningPriority = "high" | "medium" | "low";

export type WeeklyPriority = {
  rank: number;
  domain: ScoreDomain;
  priority: PlanningPriority;
  title: string;
  reason: string;
  action: string | null;
  insightId: string;
};

export type WeeklyPlan = {
  priorities: WeeklyPriority[];
};

const priorityRank: Record<PlanningPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const planningPriority = (insight: WeeklyInsight): PlanningPriority => {
  if (insight.priority === "high") return "high";
  if (insight.priority === "medium") return "medium";
  return "low";
};

export function generateWeeklyPlan(
  _metrics: WeeklyMetrics,
  score: WeeklyScore,
  insights: WeeklyInsight[],
): WeeklyPlan {
  const candidates = insights
    .filter(
      (
        insight,
      ): insight is WeeklyInsight & {
        domain: ScoreDomain;
        action: string;
      } =>
        insight.domain !== null && insight.action !== null,
    )
    .filter((insight) => score.domains[insight.domain].available)
    .map((insight) => ({
      insight,
      priority: planningPriority(insight),
    }))
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  const seenDomains = new Set<ScoreDomain>();
  const priorities: WeeklyPriority[] = [];

  for (const candidate of candidates) {
    const domain = candidate.insight.domain;

    // Planning should produce one clear recommendation per life area.
    if (seenDomains.has(domain)) continue;

    seenDomains.add(domain);

    priorities.push({
      rank: priorities.length + 1,
      domain,
      priority: candidate.priority,
      title: candidate.insight.title,
      reason: candidate.insight.description,
      action: candidate.insight.action,
      insightId: candidate.insight.id,
    });

    // v1 deliberately keeps the plan focused rather than generating a
    // long task list from every available signal.
    if (priorities.length >= 4) break;
  }

  return { priorities };
}
