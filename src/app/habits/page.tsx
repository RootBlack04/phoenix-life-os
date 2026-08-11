import { AppShell } from "@/components/layout/app-shell";
import { getHabits, getHabitHeatmap } from "@/lib/db";
import { HabitsClient } from "@/components/domain/habits-client";

export const dynamic = "force-dynamic";

const APP_TIMEZONE = "Africa/Casablanca";

function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function getMondayDateKey() {
  const todayKey = getDateKeyInTimeZone(new Date(), APP_TIMEZONE);

  const date = new Date(`${todayKey}T00:00:00.000Z`);

  const mondayOffset = (date.getUTCDay() + 6) % 7;

  date.setUTCDate(date.getUTCDate() - mondayOffset);

  return date.toISOString().slice(0, 10);
}

const heatmapColors = [
  "rgba(255,255,255,0.05)",
  "rgba(52,211,153,0.25)",
  "rgba(52,211,153,0.45)",
  "rgba(52,211,153,0.7)",
  "rgba(52,211,153,0.95)",
];

export default async function HabitsPage() {
  const [habits, heatmap] = await Promise.all([getHabits(), getHabitHeatmap()]);

  const mondayDate = getMondayDateKey();

  const weeks = Array.from({ length: 26 }, (_, week) =>
    heatmap.slice(week * 7, week * 7 + 7),
  );

  return (
    <AppShell title="Habits">
      <div className="space-y-6">
        {/* =====================================================
            WEEKLY HABIT TRACKER
        ====================================================== */}

        <HabitsClient habits={habits} mondayDate={mondayDate} />

        {/* =====================================================
            YEAR HEATMAP
        ====================================================== */}

        <div className="glass rounded-2xl p-5">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
              GitHub-style consistency grid, last 26 weeks
            </p>

            <h2 className="mt-1 text-sm font-semibold text-text-primary">
              Year Heatmap
            </h2>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-max">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((cell) => {
                    const level =
                      cell.count >= 5
                        ? 4
                        : cell.count >= 3
                          ? 3
                          : cell.count >= 2
                            ? 2
                            : cell.count >= 1
                              ? 1
                              : 0;

                    return (
                      <div
                        key={cell.date}
                        className="h-3 w-3 rounded-[3px]"
                        style={{
                          background: heatmapColors[level],
                        }}
                        title={`${cell.date}: ${cell.count} habits`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-[10px] text-text-tertiary">
            <span className="mr-1">Less</span>

            {heatmapColors.map((background, index) => (
              <span
                key={index}
                className="h-3 w-3 rounded-[3px]"
                style={{ background }}
              />
            ))}

            <span className="ml-1">More</span>
          </div>
        </div>

        {/* =====================================================
            HABIT SUMMARY CARDS
        ====================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {habits.map((habit) => {
            const completed = habit.days.filter(Boolean).length;

            return (
              <div key={habit.id} className="glass rounded-2xl p-6 text-center">
                <div className="mb-3 text-3xl">{habit.emoji}</div>

                <h3 className="text-sm font-semibold text-text-primary">
                  {habit.label}
                </h3>

                <p className="mt-1 text-xs text-text-tertiary">
                  {completed}/7 this week
                </p>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple"
                    style={{
                      width: `${Math.round((completed / 7) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
