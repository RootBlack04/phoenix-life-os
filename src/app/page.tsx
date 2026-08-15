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
import { getOverviewData } from "@/lib/db";
import { getWeeklyMetrics } from "@/lib/analytics/weekly";
import { calculateWeeklyScore } from "@/lib/analytics/scores";
import { generateWeeklyInsights } from "@/lib/analytics/insights";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [data, weeklyMetrics] = await Promise.all([
    getOverviewData(),
    getWeeklyMetrics(),
  ]);

  const weeklyScore = calculateWeeklyScore(weeklyMetrics);
  const insights = generateWeeklyInsights(weeklyMetrics, weeklyScore);

  const kpisWithoutLegacyWeeklyScore = data.kpis.filter(
    (kpi) => kpi.id !== "weekly-score",
  );

  return (
    <AppShell title="Overview">
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
          <HabitsTracker habits={data.habits} />
        </div>
        <MonthlyProgress monthlyProgress={data.monthlyProgress} />
      </div>

      <QuickNotes initialNotes={data.quickNotes} />
    </AppShell>
  );
}
