import { AppShell } from "@/components/layout/app-shell";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { LifeAreas } from "@/components/dashboard/life-areas";
import { ActiveMissions } from "@/components/dashboard/active-missions";
import { WeeklyLineChart } from "@/components/charts/weekly-line-chart";
import { FocusBarChart } from "@/components/charts/focus-bar-chart";
import { TaskDonutChart } from "@/components/charts/task-donut-chart";
import { HabitsTracker } from "@/components/dashboard/habits-tracker";
import { LanguagesPreview } from "@/components/dashboard/languages-preview";
import { EngineeringPreview } from "@/components/dashboard/engineering-preview";
import { MonthlyProgress } from "@/components/dashboard/monthly-progress";
import { QuickNotes } from "@/components/dashboard/quick-notes";
import { WeeklyScoreCard } from "@/components/dashboard/weekly-score-card";
import { WeeklyInsights } from "@/components/dashboard/weekly-insights";
import { WeeklyPriorities } from "@/components/dashboard/weekly-priorities";
import { WeeklyExecutionReview } from "@/components/dashboard/weekly-execution-review";
import { getOverviewData, getTasks } from "@/lib/db";
import { getWeeklyMetrics } from "@/lib/analytics/weekly";
import { calculateWeeklyScore } from "@/lib/analytics/scores";
import { generateWeeklyInsights } from "@/lib/analytics/insights";
import { generateWeeklyPlan } from "@/lib/analytics/planning";
import { weekTimestampRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [data, tasks, weeklyMetrics] = await Promise.all([
    getOverviewData(),
    getTasks(),
    getWeeklyMetrics(),
  ]);

  const weeklyScore = calculateWeeklyScore(weeklyMetrics);
  const insights = generateWeeklyInsights(weeklyMetrics, weeklyScore);
  const weeklyPlan = generateWeeklyPlan(weeklyMetrics, weeklyScore, insights);

  const taskWeek = weekTimestampRange(weeklyMetrics.week.start);
  const dashboardTasks = tasks
    .filter((task) => {
      return (
        task.createdAt >= taskWeek.start &&
        task.createdAt < taskWeek.endExclusive
      );
    })
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as "PENDING" | "IN_PROGRESS" | "DONE",
      priority: task.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    }));

  const kpisWithoutLegacyWeeklyScore = data.kpis.filter(
    (kpi) => kpi.id !== "weekly-score",
  ).map((kpi) => kpi.id === "consistency" ? {
    ...kpi,
    value: weeklyMetrics.current.habits.expected > 0 ? String(weeklyMetrics.current.habits.completionRate) : "—",
    deltaLabel: "Completions / configured weekly targets",
    trend: [],
  } : kpi);

  return (
    <AppShell title="Overview">
      <WeeklyPriorities plan={weeklyPlan} tasks={dashboardTasks} />

      <WeeklyExecutionReview
        metrics={weeklyMetrics.current.tasks}
        week={weeklyMetrics.week}
      />

      <WeeklyScoreCard score={weeklyScore} />
      <WeeklyInsights insights={insights} />

      <KpiGrid kpis={kpisWithoutLegacyWeeklyScore} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LifeAreas lifeAreas={data.lifeAreas} />
        </div>

        <ActiveMissions missions={data.missions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WeeklyLineChart weeklyProgress={data.weeklyProgress} />

        <FocusBarChart focusTime={data.focusTime} />

        <TaskDonutChart taskStatus={data.taskStatus} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LanguagesPreview languages={data.languages} />

        <EngineeringPreview engineeringTracks={data.engineeringTracks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <HabitsTracker habits={data.habits} mondayDate={weeklyMetrics.week.start} />
        </div>

        <MonthlyProgress monthlyProgress={data.monthlyProgress} />
      </div>

      <QuickNotes initialNotes={data.quickNotes} />
    </AppShell>
  );
}
