import "server-only";

import type { WeeklyMetrics } from "@/lib/analytics/weekly";

export const SCORE_WEIGHTS = {
  habits: 0.2,
  languages: 0.2,
  engineering: 0.2,
  career: 0.15,
  health: 0.15,
  mindset: 0.1,
} as const;

export type ScoreDomain =
  | "habits"
  | "languages"
  | "engineering"
  | "career"
  | "health"
  | "mindset";

export type DomainScore = {
  score: number | null;
  weight: number;
  available: boolean;
  reason: string;
};

export type WeeklyScore = {
  overall: number | null;
  domains: Record<ScoreDomain, DomainScore>;
  availableWeight: number;
  previousOverall: number | null;
  change: number | null;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const weightedAverage = (
  domains: Record<ScoreDomain, DomainScore>,
): number | null => {
  const available = Object.values(domains).filter(
    (domain) => domain.available && domain.score !== null,
  );

  if (!available.length) return null;

  const weightTotal = available.reduce((sum, domain) => sum + domain.weight, 0);
  const weightedTotal = available.reduce(
    (sum, domain) => sum + (domain.score ?? 0) * domain.weight,
    0,
  );

  return round(weightedTotal / weightTotal);
};

const buildDomain = (
  score: number | null,
  weight: number,
  reason: string,
): DomainScore => ({
  score: score === null ? null : clamp(Math.round(score)),
  weight,
  available: score !== null,
  reason,
});

const getHabitsScore = (metrics: WeeklyMetrics["current"]) => {
  if (metrics.habits.expected <= 0) return null;
  return metrics.habits.completionRate;
};

const getLanguagesScore = (metrics: WeeklyMetrics["current"]) => {
  if (metrics.languages.goalHours <= 0) return null;
  return metrics.languages.goalCompletionRate;
};

const getEngineeringScore = (metrics: WeeklyMetrics["current"]) => {
  const values = [
    metrics.engineering.averageTrackProgress,
    metrics.engineering.averageProjectProgress,
  ];

  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
};

const getCareerScore = (metrics: WeeklyMetrics["current"]) => {
  // Career has no configured weekly application target in the current data model.
  // Therefore zero applications is not treated as a failure and no score is
  // fabricated until a real target exists.
  const activity =
    metrics.career.applications +
    metrics.career.interviews +
    metrics.career.offers;

  return activity > 0 ? 100 : null;
};

const getHealthScore = (metrics: WeeklyMetrics["current"]) => {
  const components: number[] = [];

  if (metrics.health.averageSleep !== null) {
    components.push(clamp((metrics.health.averageSleep / 8) * 100));
  }

  if (metrics.health.averageWater !== null) {
    components.push(clamp((metrics.health.averageWater / 2.5) * 100));
  }

  if (metrics.health.averageSteps !== null) {
    components.push(clamp((metrics.health.averageSteps / 10000) * 100));
  }

  if (metrics.health.workoutDays > 0) {
    components.push(clamp((metrics.health.workoutDays / 4) * 100));
  }

  return components.length
    ? components.reduce((sum, value) => sum + value, 0) / components.length
    : null;
};

const getMindsetScore = (metrics: WeeklyMetrics["current"]) => {
  if (metrics.mindset.averageMood === null && metrics.mindset.journalDays === 0) {
    return null;
  }

  const components: number[] = [];

  if (metrics.mindset.averageMood !== null) {
    components.push(clamp((metrics.mindset.averageMood / 5) * 100));
  }

  if (metrics.mindset.journalDays > 0) {
    components.push(clamp((metrics.mindset.journalDays / 7) * 100));
  }

  return components.length
    ? components.reduce((sum, value) => sum + value, 0) / components.length
    : null;
};

const calculateDomains = (metrics: WeeklyMetrics["current"]) => ({
  habits: buildDomain(
    getHabitsScore(metrics),
    SCORE_WEIGHTS.habits,
    metrics.habits.expected > 0
      ? "Habit completion rate"
      : "No habit targets available this week",
  ),
  languages: buildDomain(
    getLanguagesScore(metrics),
    SCORE_WEIGHTS.languages,
    metrics.languages.goalHours > 0
      ? "Study time against weekly language goals"
      : "No language weekly goals available",
  ),
  engineering: buildDomain(
    getEngineeringScore(metrics),
    SCORE_WEIGHTS.engineering,
    "Average current engineering track and project progress",
  ),
  career: buildDomain(
    getCareerScore(metrics),
    SCORE_WEIGHTS.career,
    metrics.career.applications +
      metrics.career.interviews +
      metrics.career.offers >
      0
      ? "Career activity recorded this week"
      : "No configured career activity target; excluded from score",
  ),
  health: buildDomain(
    getHealthScore(metrics),
    SCORE_WEIGHTS.health,
    "Available sleep, water, steps and workout metrics",
  ),
  mindset: buildDomain(
    getMindsetScore(metrics),
    SCORE_WEIGHTS.mindset,
    "Available mood and journal consistency metrics",
  ),
});

export function calculateWeeklyScore(metrics: WeeklyMetrics): WeeklyScore {
  const domains = calculateDomains(metrics.current);
  const previousDomains = calculateDomains(metrics.previous);

  const overall = weightedAverage(domains);
  const previousOverall = weightedAverage(previousDomains);

  return {
    overall,
    domains,
    availableWeight: round(
      Object.values(domains)
        .filter((domain) => domain.available)
        .reduce((sum, domain) => sum + domain.weight, 0),
      2,
    ),
    previousOverall,
    change:
      overall !== null && previousOverall !== null
        ? round(overall - previousOverall)
        : null,
  };
}
