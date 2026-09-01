import "server-only";

import { prisma } from "@/lib/prisma";

export const DEMO_USER_ID = "demo-user";
export const APP_TIMEZONE = "Africa/Casablanca";

type WeeklyRangeMetrics = {
  habits: {
    completed: number;
    expected: number;
    completionRate: number;
  };
  languages: {
    studyMinutes: number;
    studyHours: number;
    goalHours: number;
    goalCompletionRate: number;
    sessions: number;
  };
  engineering: {
    averageTrackProgress: number;
    averageProjectProgress: number;
    activeProjects: number;
    completedProjects: number;
  };
  career: {
    applications: number;
    interviews: number;
    offers: number;
    rejections: number;
  };
  health: {
    averageSleep: number | null;
    averageWater: number | null;
    averageSteps: number | null;
    workoutDays: number;
  };
  mindset: {
    averageMood: number | null;
    journalDays: number;
  };
  tasks: {
    completed: number;
    inProgress: number;
    total: number;
    completionRate: number;
  };
  daily: {
    averageScore: number | null;
    focusHours: number;
    daysTracked: number;
    daysOnTrack: number;
  };
};

export type WeeklyMetrics = {
  week: {
    start: string;
    end: string;
  };
  previousWeek: {
    start: string;
    end: string;
  };
  current: WeeklyRangeMetrics;
  previous: WeeklyRangeMetrics;
};

type DateRange = {
  startKey: string;
  endKey: string;
  start: Date;
  endExclusive: Date;
};

const toDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
};

const dateFromKey = (key: string) => new Date(`${key}T00:00:00.000Z`);

const addDays = (key: string, amount: number) => {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const getMondayKey = (date = new Date()) => {
  const todayKey = toDateKey(date);
  const today = dateFromKey(todayKey);
  const mondayOffset = (today.getUTCDay() + 6) % 7;

  return addDays(todayKey, -mondayOffset);
};

const makeRange = (mondayKey: string): DateRange => {
  const endKey = addDays(mondayKey, 6);

  return {
    startKey: mondayKey,
    endKey,
    start: dateFromKey(mondayKey),
    endExclusive: dateFromKey(addDays(mondayKey, 7)),
  };
};

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

const round = (value: number | null, decimals = 1) => {
  if (value === null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const percentage = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

// EngineeringTrack and Project currently store only their latest progress.
// They do not contain dated progress history, so their values are exposed as
// current-state snapshots and must not be used for week-over-week trend deltas.
async function getRangeMetrics(range: DateRange) {
  const [habits, languages, tracks, projects, career, health, journal, tasks, daily] =
    await Promise.all([
      prisma.habit.findMany({
        where: { userId: DEMO_USER_ID },
        include: {
          logs: {
            where: {
              date: {
                gte: range.start,
                lt: range.endExclusive,
              },
            },
          },
        },
      }),
      prisma.language.findMany({
        where: { userId: DEMO_USER_ID },
        include: {
          studySessions: {
            where: {
              date: {
                gte: range.start,
                lt: range.endExclusive,
              },
            },
          },
        },
      }),
      prisma.engineeringTrack.findMany({ where: { userId: DEMO_USER_ID } }),
      prisma.project.findMany({ where: { userId: DEMO_USER_ID } }),
      prisma.jobApplication.findMany({
        where: {
          userId: DEMO_USER_ID,
          appliedOn: {
            gte: range.start,
            lt: range.endExclusive,
          },
        },
      }),
      prisma.healthMetric.findMany({
        where: {
          userId: DEMO_USER_ID,
          date: {
            gte: range.start,
            lt: range.endExclusive,
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.journalEntry.findMany({
        where: {
          userId: DEMO_USER_ID,
          date: {
            gte: range.start,
            lt: range.endExclusive,
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.task.findMany({
        where: {
          userId: DEMO_USER_ID,
          OR: [
            {
              completedAt: {
                gte: range.start,
                lt: range.endExclusive,
              },
            },
            {
              dueDate: {
                gte: range.start,
                lt: range.endExclusive,
              },
            },
            {
              createdAt: {
                gte: range.start,
                lt: range.endExclusive,
              },
            },
          ],
        },
      }),
      prisma.dailyMetric.findMany({
        where: {
          userId: DEMO_USER_ID,
          date: {
            gte: range.start,
            lt: range.endExclusive,
          },
        },
        orderBy: { date: "asc" },
      }),
    ]);

  const habitExpected = habits.reduce(
    (sum, habit) => sum + Math.min(habit.target, 7),
    0,
  );
  const habitCompleted = habits.reduce(
    (sum, habit) => sum + habit.logs.filter((log) => log.completed).length,
    0,
  );

  const studyMinutes = languages.reduce(
    (sum, language) =>
      sum + language.studySessions.reduce((sessionSum, session) => sessionSum + session.minutes, 0),
    0,
  );
  const goalHours = languages.reduce((sum, language) => sum + language.weeklyGoalHours, 0);

  const applications = career.length;
  const interviews = career.filter((application) => application.stage === "INTERVIEW").length;
  const offers = career.filter((application) => application.stage === "OFFER").length;
  const rejections = career.filter((application) => application.stage === "REJECTED").length;

  const averageSleep = average(
    health.flatMap((entry) => (entry.sleep == null ? [] : [entry.sleep])),
  );
  const averageWater = average(
    health.flatMap((entry) => (entry.water == null ? [] : [entry.water])),
  );
  const averageSteps = average(
    health.flatMap((entry) => (entry.steps == null ? [] : [entry.steps])),
  );
  const workoutDays = health.filter((entry) => (entry.workouts ?? 0) > 0).length;

  const averageMood = average(journal.map((entry) => entry.mood));
  const journalDays = new Set(journal.map((entry) => entry.date.toISOString().slice(0, 10))).size;

  const completedTasks = tasks.filter(
    (task) =>
      task.completedAt !== null &&
      task.completedAt >= range.start &&
      task.completedAt < range.endExclusive,
  ).length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "IN_PROGRESS",
  ).length;
  const dailyScores = daily.map((metric) => metric.score);
  const daysOnTrack = daily.filter((metric) => metric.score >= metric.goalScore).length;

  return {
    habits: {
      completed: habitCompleted,
      expected: habitExpected,
      completionRate: percentage(habitCompleted, habitExpected),
    },
    languages: {
      studyMinutes,
      studyHours: round(studyMinutes / 60, 1) ?? 0,
      goalHours: round(goalHours, 1) ?? 0,
      goalCompletionRate: percentage(studyMinutes, goalHours * 60),
      sessions: languages.reduce((sum, language) => sum + language.studySessions.length, 0),
    },
    engineering: {
      averageTrackProgress:
        tracks.length > 0
          ? Math.round(tracks.reduce((sum, track) => sum + track.percent, 0) / tracks.length)
          : 0,
      averageProjectProgress:
        projects.length > 0
          ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
          : 0,
      activeProjects: projects.filter((project) => project.status === "IN_PROGRESS").length,
      completedProjects: projects.filter((project) => project.status === "DONE").length,
    },
    career: {
      applications,
      interviews,
      offers,
      rejections,
    },
    health: {
      averageSleep: round(averageSleep),
      averageWater: round(averageWater),
      averageSteps: round(averageSteps, 0),
      workoutDays,
    },
    mindset: {
      averageMood: round(averageMood),
      journalDays,
    },
    tasks: {
      completed: completedTasks,
      inProgress: inProgressTasks,
      total: tasks.length,
      completionRate: percentage(completedTasks, tasks.length),
    },
    daily: {
      averageScore: round(average(dailyScores)),
      focusHours: round(daily.reduce((sum, metric) => sum + metric.focusHours, 0), 1) ?? 0,
      daysTracked: daily.length,
      daysOnTrack,
    },
  };
}

/**
 * Aggregate the existing Phoenix Life OS data into a normalized
 * current-week / previous-week analytics object.
 *
 * This is intentionally a calculated read model. It does not create
 * a Prisma model or duplicate analytics data in the database.
 */
export async function getWeeklyMetrics(date = new Date()): Promise<WeeklyMetrics> {
  const currentRange = makeRange(getMondayKey(date));
  const previousRange = makeRange(addDays(currentRange.startKey, -7));

  const [current, previous] = await Promise.all([
    getRangeMetrics(currentRange),
    getRangeMetrics(previousRange),
  ]);

  return {
    week: {
      start: currentRange.startKey,
      end: currentRange.endKey,
    },
    previousWeek: {
      start: previousRange.startKey,
      end: previousRange.endKey,
    },
    current,
    previous,
  };
}
