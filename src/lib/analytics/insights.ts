import "server-only";

import type { WeeklyMetrics } from "@/lib/analytics/weekly";
import type { ScoreDomain, WeeklyScore } from "@/lib/analytics/scores";

export type InsightKind = "warning" | "positive" | "info";
export type InsightPriority = "high" | "medium" | "low";

export type WeeklyInsight = {
  id: string;
  kind: InsightKind;
  priority: InsightPriority;
  title: string;
  description: string;
  action: string | null;
  domain: ScoreDomain | null;
};

const priorityForScore = (score: number): InsightPriority => {
  if (score < 40) return "high";
  if (score < 60) return "medium";
  return "low";
};

const labels: Record<ScoreDomain, string> = {
  habits: "Habits",
  languages: "Languages",
  engineering: "Engineering",
  career: "Career",
  health: "Health",
  mindset: "Mindset",
};

export function generateWeeklyInsights(
  metrics: WeeklyMetrics,
  score: WeeklyScore,
): WeeklyInsight[] {
  const insights: WeeklyInsight[] = [];

  // Do not compare a partial week with a full previous week or changed targets.
  const languageScore = score.domains.languages;
  if (languageScore.available && languageScore.score !== null) {
    if (metrics.current.languages.goalCompletionRate < 50) {
      insights.push({
        id: "languages-behind-target",
        kind: "warning",
        priority: priorityForScore(languageScore.score),
        title: "Language study is behind target",
        description: `You logged ${metrics.current.languages.studyHours}h across ${metrics.current.languages.sessions} sessions, reaching ${metrics.current.languages.goalCompletionRate}% of the ${metrics.current.languages.goalHours}h weekly goal.`,
        action: "Schedule another focused language session this week.",
        domain: "languages",
      });
    } else {
      insights.push({
        id: "languages-on-track",
        kind: "positive",
        priority: "low",
        title: "Language study is on track",
        description: `You reached ${metrics.current.languages.goalCompletionRate}% of the weekly language goal across ${metrics.current.languages.sessions} sessions.`,
        action: null,
        domain: "languages",
      });
    }
  }

  const availableDomainScores = (
    Object.entries(score.domains) as Array<
      [ScoreDomain, WeeklyScore["domains"][ScoreDomain]]
    >
  )
    .filter(([, domain]) => domain.available && domain.score !== null)
    .map(([domain, value]) => ({
      domain,
      score: value.score as number,
    }))
    .sort((a, b) => b.score - a.score);

  const strongest = availableDomainScores[0];
  if (strongest) {
    insights.push({
      id: "strongest-domain",
      kind: "positive",
      priority: "low",
      title: `${labels[strongest.domain]} is your strongest tracked area`,
      description: `Its current score is ${strongest.score}/100, the highest among domains with available data.`,
      action: null,
      domain: strongest.domain,
    });
  }

  // Add one actionable low-score insight only when that domain does not
  // already have a more specific trend/target insight.
  const domainsWithSpecificInsights = new Set(
    insights
      .map((insight) => insight.domain)
      .filter((domain): domain is ScoreDomain => domain !== null),
  );

  for (const item of availableDomainScores) {
    if (item.score >= 60 || domainsWithSpecificInsights.has(item.domain)) {
      continue;
    }

    if (item.domain === "engineering") {
      insights.push({
        id: "engineering-opportunity",
        kind: "warning",
        priority: priorityForScore(item.score),
        title: "Engineering has room to grow",
        description: `The current Engineering score is ${item.score}/100, based on current track and project progress.`,
        action:
          "Choose one active engineering project and move it forward this week.",
        domain: "engineering",
      });
      domainsWithSpecificInsights.add(item.domain);
      continue;
    }

    insights.push({
      id: `${item.domain}-opportunity`,
      kind: "warning",
      priority: priorityForScore(item.score),
      title: `${labels[item.domain]} needs attention`,
      description: `The current ${labels[item.domain]} score is ${item.score}/100.`,
      action: `Give ${labels[item.domain]} a focused session this week.`,
      domain: item.domain,
    });
    domainsWithSpecificInsights.add(item.domain);
  }

  if (!score.domains.career.available) {
    insights.push({
      id: "career-no-data",
      kind: "info",
      priority: "low",
      title: "Career has no scored activity yet",
      description:
        "Career is currently excluded from the Weekly Score because no configured weekly activity target is available.",
      action:
        "When career tracking is ready, define a measurable weekly activity target.",
      domain: "career",
    });
  }

  if (
    metrics.current.tasks.total === 0 &&
    metrics.current.daily.daysTracked === 0
  ) {
    insights.push({
      id: "low-activity-data",
      kind: "info",
      priority: "low",
      title: "Some activity data is missing this week",
      description:
        "No weekly task activity or daily metrics are currently available, so those areas are not used to create a negative score.",
      action:
        "Keep logging daily activity so the next weekly review has more evidence.",
      domain: null,
    });
  }

  const priorityRank: Record<InsightPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const kindRank: Record<InsightKind, number> = {
    warning: 0,
    info: 1,
    positive: 2,
  };

  const byPriority = [...insights].sort(
    (a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      kindRank[a.kind] - kindRank[b.kind],
  );

  const selected: WeeklyInsight[] = [];
  const selectedIds = new Set<string>();

  const select = (insight: WeeklyInsight | undefined) => {
    if (!insight || selectedIds.has(insight.id)) return;
    selected.push(insight);
    selectedIds.add(insight.id);
  };

  // Keep the strongest tracked area visible in the weekly review.
  select(insights.find((insight) => insight.id === "strongest-domain"));

  // Keep career availability visible so the user understands why its
  // 15% weight is not currently part of the score denominator.
  select(insights.find((insight) => insight.id === "career-no-data"));

  // Fill the remaining slots with the most important actionable insights.
  for (const insight of byPriority) {
    if (selected.length >= 6) break;
    select(insight);
  }

  // Preserve the guaranteed insights, but present the final list in the same
  // priority order the user should act on: high → medium → low.
  return selected.sort(
    (a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      kindRank[a.kind] - kindRank[b.kind],
  );
}
