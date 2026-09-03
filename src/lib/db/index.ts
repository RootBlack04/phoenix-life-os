import "server-only";

import { prisma } from "@/lib/prisma";
import type { IncomeType, JobStage, LifeAreaKey, ResourceType } from "@/generated/prisma/enums";
import { APP_TIMEZONE, localDateKey, dateFromKey, mondayKey, addDateDays } from "@/lib/dates";

import type {
  KpiMetric,
  LifeArea,
  Mission,
  EngineeringTrack,
  EngineeringProject,
  LanguageProgress,
  HabitRow,
  MonthlyWeek,
  FocusBar,
  WeeklyPoint,
  TaskStatusSlice,
} from "@/types";

export const DEMO_USER_ID = "demo-user";

const DAY = 24 * 60 * 60 * 1000;



/* =========================================================
   DATE HELPERS
   ========================================================= */

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const addDays = (date: Date, days: number) =>
  new Date(startOfUtcDay(date).getTime() + days * DAY);

/**
 * Convert the current instant into a calendar date
 * in the application's timezone.
 *
 * Example:
 *
 * Morocco:
 * Tuesday 00:30
 *
 * => 2026-08-04
 *
 * It must NOT become:
 * 2026-08-03T23:00:00.000Z
 */
const getDateKeyInTimeZone = (date: Date, timeZone: string) => {
  if (timeZone !== APP_TIMEZONE) throw new Error("Unsupported application timezone");
  return localDateKey(date);
};
const dateKeyToUtcDate = dateFromKey;
const addDaysToDateKey = addDateDays;
const getMondayDateKey = mondayKey;

/**
 * Return current Monday -> Sunday.
 */
const last7Days = () => {
  const monday = getMondayDateKey();

  return Array.from({ length: 7 }, (_, index) =>
    dateKeyToUtcDate(addDaysToDateKey(monday, index)),
  );
};

const dayLabel = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

/* =========================================================
   USER
   ========================================================= */

export async function getUser() {
  return prisma.user.findUniqueOrThrow({
    where: {
      id: DEMO_USER_ID,
    },
  });
}

export async function getSettings() {
  return prisma.userSettings.upsert({
    where: {
      userId: DEMO_USER_ID,
    },
    update: {},
    create: {
      userId: DEMO_USER_ID,
    },
  });
}

export async function updateUserProfile(data: {
  name: string;
  timezone?: string;
}) {
  return prisma.user.update({
    where: {
      id: DEMO_USER_ID,
    },
    data,
  });
}

export async function updateSettings(data: {
  theme?: "AURORA" | "SUNSET" | "FOREST";
  sidebarCollapsed: boolean;
  dailyMissionReminders?: boolean;
  weeklyReviewEmail?: boolean;
  habitStreakAlerts?: boolean;
  jobApplicationFollowUps?: boolean;
  weeklyFocusHours?: number;
  weeklyScoreGoal?: number;
  language?: "ENGLISH" | "SPANISH" | "FRENCH" | "ARABIC";
}) {
  return prisma.userSettings.upsert({
    where: {
      userId: DEMO_USER_ID,
    },
    update: data,
    create: {
      userId: DEMO_USER_ID,
      ...data,
    },
  });
}

/* =========================================================
   GOALS
   ========================================================= */

export async function getGoals() {
  return prisma.goal.findMany({
    where: {
      userId: DEMO_USER_ID,
      status: "IN_PROGRESS",
    },

    orderBy: [
      {
        priority: "desc",
      },
      {
        deadline: "asc",
      },
    ],
  });
}

type GoalFields = { title: string; description: string | null; progress: number; deadline: Date | null };

// History page includes every non-completed status; Overview keeps its existing
// IN_PROGRESS-only query and snapshot semantics.
export async function getGoalHistory(view: "active" | "completed") {
  return prisma.goal.findMany({
    where: { userId: DEMO_USER_ID, status: view === "completed" ? "DONE" : { not: "DONE" } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
}

export async function reopenGoal(id: string) {
  return prisma.goal.update({
    where: { id, userId: DEMO_USER_ID, status: "DONE" },
    data: { status: "IN_PROGRESS" },
  });
}

export async function createGoal(data: GoalFields & { category: LifeAreaKey }) {
  return prisma.goal.create({ data: {
    userId: DEMO_USER_ID, title: data.title, description: data.description,
    category: data.category, progress: data.progress, deadline: data.deadline,
    priority: "MEDIUM", status: "IN_PROGRESS",
  } });
}

export async function updateGoal(id: string, data: GoalFields) {
  return prisma.goal.update({
    where: { id, userId: DEMO_USER_ID, status: { not: "DONE" } },
    data: { title: data.title, description: data.description, progress: data.progress, deadline: data.deadline },
  });
}

export async function completeGoal(id: string) {
  return prisma.goal.update({
    where: { id, userId: DEMO_USER_ID },
    data: { status: "DONE" },
  });
}

/* =========================================================
   TASKS
   ========================================================= */

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: Date;
};

export async function createTask(input: CreateTaskInput) {
  return prisma.task.create({
    data: {
      userId: DEMO_USER_ID,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate,
    },
  });
}

export async function updateTaskStatus(
  id: string,
  status: "PENDING" | "IN_PROGRESS" | "DONE",
  expectedStatus?: "PENDING" | "IN_PROGRESS",
) {
  // The status predicate is checked atomically by PostgreSQL. Concurrent DONE
  // retries must not overwrite the completion instant of the first transition.
  await prisma.task.updateMany({
    where: {
      id,
      userId: DEMO_USER_ID,
      // Next Action supplies its displayed status, preventing stale Start from
      // reopening completed work. Existing callers retain their lifecycle.
      ...(expectedStatus
        ? { status: expectedStatus }
        : status === "DONE" ? { status: { not: "DONE" as const } } : {}),
    },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });
  const task = await prisma.task.findFirst({ where: { id, userId: DEMO_USER_ID } });

  if (!task) {
    throw new Error("Task not found");
  }

  return task;
}

export async function getTasks() {
  return prisma.task.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

/* =========================================================
   HABITS
   ========================================================= */

export async function getHabits() {
  /*
   * IMPORTANT:
   *
   * These 7 dates are calculated according
   * to Africa/Casablanca.
   *
   * Monday -> Sunday
   */
  const days = last7Days();

  /*
   * Load only logs belonging to the
   * current week.
   */
  const logs = await prisma.habitLog.findMany({
    where: {
      habit: {
        userId: DEMO_USER_ID,
      },

      date: {
        gte: days[0],
        lte: days[6],
      },
    },

    orderBy: {
      date: "asc",
    },
  });

  const habits = await prisma.habit.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  /*
   * Convert database logs into:
   *
   * [
   *   Monday,
   *   Tuesday,
   *   Wednesday,
   *   Thursday,
   *   Friday,
   *   Saturday,
   *   Sunday
   * ]
   */
  return habits.map((habit) => ({
    id: habit.id,

    label: habit.name,

    emoji: habit.emoji,

    days: days.map(
      (day) =>
        logs.find(
          (log) =>
            log.habitId === habit.id && log.date.getTime() === day.getTime(),
        )?.completed ?? false,
    ),
  }));
}

/**
 * Habit heatmap.
 *
 * IMPORTANT:
 * The previous implementation used:
 *
 * startOfUtcDay(new Date())
 *
 * directly.
 *
 * That can create timezone inconsistencies.
 *
 * We now calculate the current Casablanca
 * calendar date first.
 */
export async function getHabitHeatmap() {
  const todayKey = getDateKeyInTimeZone(new Date(), APP_TIMEZONE);

  /*
   * 26 weeks = 182 days.
   *
   * We want exactly 182 calendar dates.
   */
  const startKey = addDaysToDateKey(todayKey, -181);

  const start = dateKeyToUtcDate(startKey);

  const end = dateKeyToUtcDate(todayKey);

  const logs = await prisma.habitLog.findMany({
    where: {
      habit: {
        userId: DEMO_USER_ID,
      },

      date: {
        gte: start,
        lte: end,
      },
    },

    select: {
      date: true,
      completed: true,
    },
  });

  /*
   * Count completed habits per
   * calendar date.
   */
  const byDate = new Map<string, number>();

  for (const log of logs) {
    if (!log.completed) {
      continue;
    }

    /*
     * Database stores our calendar date
     * as UTC midnight.
     *
     * Therefore this is safe.
     */
    const key = log.date.toISOString().slice(0, 10);

    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }

  /*
   * Return exactly 26 * 7 cells.
   */
  return Array.from({ length: 26 * 7 }, (_, index) => {
    const dateKey = addDaysToDateKey(startKey, index);

    return {
      date: dateKey,

      count: byDate.get(dateKey) ?? 0,
    };
  });
}

/**
 * Create/update a habit log.
 *
 * dateKey MUST be:
 *
 * YYYY-MM-DD
 *
 * Example:
 *
 * 2026-08-04
 *
 * NOT:
 *
 * 2026-08-03T23:00:00.000Z
 *
 * This prevents the Tuesday -> Monday bug.
 */
export async function toggleHabit(
  habitId: string,
  dateKey: string,
  completed: boolean,
) {
  const date = dateKeyToUtcDate(dateKey);

  /*
   * Because the schema has:
   *
   * @@unique([habitId, date])
   *
   * this upsert guarantees that
   * one habit can have only one record
   * for a given date.
   */
  return prisma.habitLog.upsert({
    where: {
      habitId_date: {
        habitId,
        date,
      },
    },

    update: {
      completed,
    },

    create: {
      habitId,
      date,
      completed,
    },
  });
}

/* =========================================================
   NOTES
   ========================================================= */

export async function getNotes() {
  return prisma.note.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    orderBy: [
      {
        pinned: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],

    select: {
      id: true,
      title: true,
      content: true,
      tag: true,
      pinned: true,
    },
  });
}

export async function updateNote(
  id: string,
  data: {
    title?: string;
    content?: string;
    tag?: string;
    pinned?: boolean;
  },
) {
  return prisma.note.update({
    where: {
      id,
      userId: DEMO_USER_ID,
    },

    data,
  });
}

export async function createNote(data: {
  title: string;
  content: string;
  tag?: string;
  pinned?: boolean;
}) {
  return prisma.note.create({
    data: {
      ...data,
      userId: DEMO_USER_ID,
    },
  });
}

export async function deleteNote(id: string) {
  return prisma.note.delete({
    where: {
      id,
      userId: DEMO_USER_ID,
    },
  });
}

/* =========================================================
   LANGUAGES
   ========================================================= */

export async function getLanguages() {
  const languages = await prisma.language.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    include: {
      progress: {
        orderBy: {
          date: "asc",
        },
      },

      studySessions: {
        orderBy: {
          date: "desc",
        },
      },
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  return languages.map((language) => ({
    id: language.id,
    name: language.name,
    flag: language.flag,
    currentLevel: language.currentLevel,
    targetLevel: language.targetLevel,
    percent: language.percent,
    vocabulary: language.vocabulary,
    grammar: language.grammar,
    listening: language.listening,
    speaking: language.speaking,
    writing: language.writing,
    reading: language.reading,
    hoursLogged: language.hoursLogged,
    dailyGoalMinutes: language.dailyGoalMinutes,
    weeklyGoalHours: language.weeklyGoalHours,

    weeklyTrend: language.progress.map((progress) => ({
      week: progress.week,
      score: progress.score,
    })),

    studySessions: language.studySessions.map((session) => ({
      id: session.id,
      date: session.date.toISOString(),
      minutes: session.minutes,
      skill: session.skill,
      note: session.note,
    })),
  }));
}

export async function createLanguageStudySession(data: {
  languageId: string;
  date: Date;
  minutes: number;
  skill: string;
  note?: string;
}) {
  return prisma.languageStudySession.create({
    data: {
      languageId: data.languageId,
      date: data.date,
      minutes: data.minutes,
      skill: data.skill,
      note: data.note,
    },
  });
}

export async function updateLanguageSkills(
  id: string,
  data: {
    percent: number;
    vocabulary: number;
    grammar: number;
    listening: number;
    speaking: number;
    writing: number;
    reading: number;
  },
) {
  return prisma.language.update({
    where: {
      id,
    },

    data: {
      percent: Math.max(0, Math.min(100, data.percent)),
      vocabulary: Math.max(0, Math.min(100, data.vocabulary)),
      grammar: Math.max(0, Math.min(100, data.grammar)),
      listening: Math.max(0, Math.min(100, data.listening)),
      speaking: Math.max(0, Math.min(100, data.speaking)),
      writing: Math.max(0, Math.min(100, data.writing)),
      reading: Math.max(0, Math.min(100, data.reading)),
    },
  });
}
/* =========================================================
   ENGINEERING
   ========================================================= */

export async function getEngineering() {
  const [tracks, projects] = await Promise.all([
    prisma.engineeringTrack.findMany({
      where: {
        userId: DEMO_USER_ID,
      },

      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.project.findMany({
      where: {
        userId: DEMO_USER_ID,
      },

      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  return {
    tracks: tracks.map((track) => ({
      id: track.id,
      label: track.label,
      icon: track.icon,
      percent: track.percent,
      status: track.status,
      tasksDone: track.tasksDone,
      tasksTotal: track.tasksTotal,
    })),

    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      stack: project.technologies,
      progress: project.progress,
      status: project.status.toLowerCase().replace("_", "-"),
    })),
  };
}

/* =========================================================
   CAREER
   ========================================================= */

export async function getCareer() {
  return prisma.jobApplication.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    orderBy: {
      appliedOn: "desc",
    },
  });
}

export async function createJobApplication(data: {
  company: string;
  role: string;
  stage: JobStage;
  appliedOn: Date;
}) {
  return prisma.jobApplication.create({ data: {
    userId: DEMO_USER_ID,
    company: data.company,
    role: data.role,
    stage: data.stage,
    appliedOn: data.appliedOn,
  } });
}

/* =========================================================
   INCOME
   ========================================================= */

export async function getIncome() {
  return prisma.income.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    orderBy: {
      amount: "desc",
    },
  });
}

export async function createIncome(data: {
  source: string;
  amount: number;
  goal?: number;
  type: "FREELANCE" | "REMOTE_JOB" | "SAVINGS" | "OTHER";
  month: Date;
}) {
  return prisma.income.create({
    data: {
      ...data,
      userId: DEMO_USER_ID,
    },
  });
}

export async function updateIncome(id: string, data: {
  source: string;
  amount: number;
  goal?: number | null;
  type: IncomeType;
  month?: Date;
}) {
  return prisma.income.update({ where: { id, userId: DEMO_USER_ID }, data });
}

/* =========================================================
   HEALTH
   ========================================================= */

export async function getHealth() {
  return prisma.healthMetric.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    orderBy: {
      date: "asc",
    },
  });
}

// Bounded history plus exact editor date and its seven-calendar-day chart window.
export async function getHealthPageData(day: string) {
  const [history, entry, trend] = await Promise.all([
    prisma.healthMetric.findMany({ where: { userId: DEMO_USER_ID }, orderBy: { date: "desc" }, take: 30 }),
    prisma.healthMetric.findUnique({ where: { userId_date: { userId: DEMO_USER_ID, date: dateFromKey(day) } } }),
    prisma.healthMetric.findMany({
      where: { userId: DEMO_USER_ID, date: { gte: dateFromKey(addDateDays(day, -6)), lte: dateFromKey(day) } },
      orderBy: { date: "asc" },
    }),
  ]);
  return { history, entry, trend };
}

export async function createHealthMetric(data: {
  date: Date;
  weight?: number | null;
  sleep?: number | null;
  water?: number | null;
  steps?: number | null;
  workouts?: number | null;
  heartRate?: number | null;
}) {
  return prisma.healthMetric.upsert({
    where: {
      userId_date: {
        userId: DEMO_USER_ID,
        date: startOfUtcDay(data.date),
      },
    },

    update: data,

    create: {
      ...data,
      userId: DEMO_USER_ID,
    },
  });
}

/* =========================================================
   MINDSET
   ========================================================= */

export async function getMindset() {
  return prisma.journalEntry.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    orderBy: {
      date: "desc",
    },
  });
}

export async function createJournalEntry(data: {
  title: string;
  content: string;
  mood: number;
  date: Date;
}) {
  return prisma.journalEntry.create({
    data: {
      ...data,
      userId: DEMO_USER_ID,
    },
  });
}

export async function updateJournalEntry(id: string, data: { title: string; content: string; mood: number; date: Date }) {
  return prisma.journalEntry.update({ where: { id, userId: DEMO_USER_ID }, data });
}

export async function deleteJournalEntry(id: string) {
  return prisma.journalEntry.delete({ where: { id, userId: DEMO_USER_ID } });
}

/* =========================================================
   RESOURCES
   ========================================================= */

export async function getResources() {
  return prisma.resource.findMany({
    where: {
      userId: DEMO_USER_ID,
    },

    orderBy: {
      createdAt: "asc",
    },
  });
}
export async function createResource(data: {
  title: string;
  type: "BOOK" | "COURSE" | "VIDEO" | "LINK" | "CERTIFICATE";
  progress?: number;
  tag: string;
  url?: string;
}) {
  return prisma.resource.create({
    data: {
      ...data,
      userId: DEMO_USER_ID,
      progress:
        typeof data.progress === "number"
          ? Math.max(0, Math.min(100, data.progress))
          : undefined,
      completed: data.progress === 100,
    },
  });
}

export async function updateResourceProgress(id: string, progress: number) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return prisma.resource.updateMany({
    where: {
      id,
      userId: DEMO_USER_ID,
    },

    data: {
      progress: safeProgress,
      completed: safeProgress === 100,
    },
  });
}

export async function updateResource(id: string, data: { title: string; type: ResourceType; tag: string; url?: string | null }) {
  return prisma.resource.update({ where: { id, userId: DEMO_USER_ID }, data });
}

export async function setResourceCompleted(id: string, completed: boolean) {
  return prisma.resource.updateMany({
    where: {
      id,
      userId: DEMO_USER_ID,
    },

    data: {
      completed,
      progress: completed ? 100 : undefined,
    },
  });
}

export async function deleteResource(id: string) {
  return prisma.resource.deleteMany({
    where: {
      id,
      userId: DEMO_USER_ID,
    },
  });
}

/* =========================================================
   OVERVIEW
   ========================================================= */

export async function getOverviewData() {
  const [
    user,
    goals,
    tasks,
    habits,
    languages,
    engineering,
    dailyMetrics,
    health,
    journal,
    notes,
    income,
  ] = await Promise.all([
    getUser(),
    getGoals(),
    getTasks(),
    getHabits(),
    getLanguages(),
    getEngineering(),

    prisma.dailyMetric.findMany({
      where: {
        userId: DEMO_USER_ID,
      },

      orderBy: {
        date: "asc",
      },
    }),

    getHealth(),
    getMindset(),
    getNotes(),
    getIncome(),
  ]);

  const categoryProgress = (category: string) => {
    const values = goals
      .filter((goal) => goal.category === category)
      .map((goal) => goal.progress);

    if (values.length) {
      return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }

    return null;
  };

  const healthLatest = health.at(-1);
  const healthParts = healthLatest ? [
    healthLatest.sleep == null ? null : Math.min(healthLatest.sleep, 8) / 8,
    healthLatest.water == null ? null : Math.min(healthLatest.water, 3) / 3,
    healthLatest.steps == null ? null : Math.min(healthLatest.steps, 10000) / 10000,
  ].filter((value): value is number => value !== null) : [];
  const healthProgress = healthParts.length
    ? Math.round(healthParts.reduce((sum, value) => sum + value, 0) / healthParts.length * 100)
    : null;

  const mindsetProgress = journal.length
    ? Math.round(
        (journal.slice(0, 7).reduce((sum, entry) => sum + entry.mood, 0) /
          Math.min(journal.length, 7)) *
          20,
      )
    : null;

  const areas = [
    {
      key: "languages",
      label: "Languages",

      percent: languages.length
        ? Math.round(
            languages.reduce((sum, language) => sum + language.percent, 0) /
              languages.length,
          )
        : null,

      status: "Current snapshot",
      color: "var(--accent-blue)",
      icon: "MessageCircle",
    },

    {
      key: "engineering",
      label: "Engineering",

      percent: engineering.tracks.length
        ? Math.round(
            engineering.tracks.reduce((sum, track) => sum + track.percent, 0) /
              engineering.tracks.length,
          )
        : null,

      status: "Current snapshot",
      color: "var(--accent-purple)",
      icon: "Code2",
    },

    {
      key: "career",
      label: "Career",
      percent: categoryProgress("CAREER"),
      status: "Good",
      color: "var(--accent-pink)",
      icon: "Briefcase",
    },

    {
      key: "income",
      label: "Income",
      percent: categoryProgress("INCOME"),
      status: "Active goal progress",
      color: "var(--warning)",
      icon: "CircleDollarSign",
    },

    {
      key: "health",
      label: "Health",
      percent: healthProgress,
      status: "Latest recorded metrics",
      color: "var(--success)",
      icon: "HeartPulse",
    },

    {
      key: "mindset",
      label: "Mindset",
      percent: mindsetProgress,
      status: "Recent journal mood",
      color: "#b58bff",
      icon: "BrainCircuit",
    },
  ];

  const availableAreas = areas.flatMap((area) => area.percent === null ? [] : [area.percent]);
  const overall = availableAreas.length ? Math.round(
    availableAreas.reduce((sum, percent) => sum + percent, 0) / availableAreas.length,
  ) : null;

  const today = dateFromKey(localDateKey(new Date()));

  const weeklyDays = Array.from({ length: 7 }, (_, index) =>
    addDays(today, index - 6),
  );

  const weekly = weeklyDays
    .map((day) =>
      dailyMetrics.find((metric) => metric.date.getTime() === day.getTime()),
    )
    .filter((metric): metric is (typeof dailyMetrics)[number] =>
      Boolean(metric),
    );

  const weeklyScore = weekly.length
    ? Math.round(
        weekly.reduce((sum, day) => sum + day.score, 0) / weekly.length,
      )
    : 0;

  const focusHours = weekly.reduce((sum, day) => sum + day.focusHours, 0);

  const completedTasks = tasks.filter((task) => task.status === "DONE").length;

  const consistencyTotal = habits.length * 7;

  const consistencyDone = habits.reduce(
    (sum, habit) => sum + habit.days.filter(Boolean).length,
    0,
  );

  const daysOnTrack = weekly.filter((day) => day.score >= day.goalScore).length;

  const typedLifeAreas = areas as LifeArea[];

  const typedKpis: KpiMetric[] = [
    {
      id: "overall",
      label: "Life-area Snapshot",
      value: overall === null ? "—" : String(overall),
      unit: "%",
      icon: "Target",
      deltaLabel: "Average of available snapshots",
      deltaPositive: true,
      trend: [],
    },

    {
      id: "weekly-score",
      label: "Weekly Score",
      value: String(weeklyScore),
      unit: "/100",
      icon: "Gauge",
      deltaLabel: "From daily metrics",
      deltaPositive: true,
      trend: weekly.map((day) => day.score),
    },

    {
      id: "focus-time",
      label: "Focus Time",
      value: weekly.length ? `${Math.floor(focusHours)}h ${Math.round((focusHours % 1) * 60)}m` : "—",
      icon: "Clock",
      deltaLabel: "Last 7 days",
      deltaPositive: true,
      trend: weekly.map((day) => day.focusHours),
    },

    {
      id: "tasks",
      label: "Tasks Completed · All time",
      value: String(completedTasks),
      unit: `/${tasks.length}`,
      icon: "CheckCircle2",
      deltaLabel: `${
        tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
      }% all-time completion`,
      deltaPositive: true,
      trend: [completedTasks],
    },

    {
      id: "consistency",
      label: "Consistency",
      value: String(
        consistencyTotal
          ? Math.round((consistencyDone / consistencyTotal) * 100)
          : 0,
      ),
      unit: "%",
      icon: "CalendarCheck",
      deltaLabel: "Habit logs this week",
      deltaPositive: true,
      trend: [consistencyDone],
    },

    {
      id: "days-on-track",
      label: "Days On Track",
      value: weekly.length ? String(daysOnTrack) : "—",
      unit: "/7",
      icon: "TrendingUp",
      deltaLabel: "Recorded target days · last 7 days",
      deltaPositive: true,
      trend: weekly.map((day) => day.score),
    },
  ];

  const missions: Mission[] = goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,

    category: goal.category.toLowerCase() as Mission["category"],

    priority: goal.priority.toLowerCase() as Mission["priority"],

    progress: goal.progress,

    deadline: goal.deadline?.toISOString() ?? null,

    status: goal.status.toLowerCase().replace("_", "-") as Mission["status"],
  }));

  const weeklyProgress: WeeklyPoint[] = weekly.map((day) => ({
    day: dayLabel(day.date),
    score: day.score,
    goal: day.goalScore,
  }));

  const focusTime: FocusBar[] = weekly.map((day) => ({
    day: dayLabel(day.date),
    hours: day.focusHours,
  }));

  const taskStatus: TaskStatusSlice[] = [
    {
      name: "Done",
      value: tasks.filter((task) => task.status === "DONE").length,
      color: "var(--success)",
    },

    {
      name: "In Progress",
      value: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      color: "var(--accent-blue)",
    },

    {
      name: "Pending",
      value: tasks.filter((task) => task.status === "PENDING").length,
      color: "var(--warning)",
    },
  ];

  const now = dateFromKey(localDateKey(new Date()));

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  const monthMetrics = dailyMetrics.filter(
    (metric) => metric.date >= monthStart && metric.date < nextMonthStart,
  );

  const monthlyProgress: MonthlyWeek[] = Array.from(
    {
      length: 5,
    },
    (_, index) => {
      const weekStart = addDays(monthStart, index * 7);

      const weekEnd = addDays(weekStart, 7);

      const weekMetrics = monthMetrics.filter(
        (metric) => metric.date >= weekStart && metric.date < weekEnd,
      );

      return {
        label: `Week ${index + 1}`,

        score: weekMetrics.length
          ? Math.round(
              weekMetrics.reduce((sum, metric) => sum + metric.score, 0) /
                weekMetrics.length,
            )
          : null,
      };
    },
  );

  const typedHabits = habits as HabitRow[];

  const typedLanguages = languages as LanguageProgress[];

  const typedTracks = engineering.tracks as EngineeringTrack[];

  const typedProjects = engineering.projects as EngineeringProject[];

  return {
    user,

    lifeAreas: typedLifeAreas,

    kpis: typedKpis,

    missions,

    weeklyProgress,

    focusTime,

    taskStatus,

    habits: typedHabits,

    monthlyProgress,

    quickNotes: notes.slice(0, 5).map((note) => ({
      id: note.id,
      text: note.content.split("\n")[0] || note.title,
    })),

    languages: typedLanguages,

    engineeringTracks: typedTracks,

    engineeringProjects: typedProjects,

    income,
  };
}

/* =========================================================
   CAREER / ENGINEERING
   ========================================================= */

export async function updateJobStage(
  id: string,
  stage: "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED",
) {
  return prisma.jobApplication.update({
    where: {
      id,
      userId: DEMO_USER_ID,
    },

    data: {
      stage,
    },
  });
}

export async function updateProjectProgress(id: string, progress: number, expectedProgress: number) {
  if (!id.trim() || ![progress, expectedProgress].every((value) => Number.isInteger(value) && value >= 0 && value <= 100)) {
    throw new Error("Invalid project progress");
  }
  const result = await prisma.project.updateMany({
    where: { id, userId: DEMO_USER_ID, progress: expectedProgress },
    data: { progress },
  });
  if (result.count !== 1) {
    throw new Error("Project unavailable or changed. Refresh and try again.");
  }
}
