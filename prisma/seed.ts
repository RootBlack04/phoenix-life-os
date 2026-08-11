import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  GoalStatus,
  Priority,
  TaskStatus,
  JobStage,
  ResourceType,
  IncomeType,
  LifeAreaKey,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: { name: "Youssef", timezone: "Africa/Casablanca", streakDays: 17 },
    create: {
      id: "demo-user",
      name: "Youssef",
      timezone: "Africa/Casablanca",
      streakDays: 17,
      memberSince: date("2026-01-12"),
    },
  });

  await prisma.dailyMetric.deleteMany({ where: { userId: user.id } });
  await prisma.healthMetric.deleteMany({ where: { userId: user.id } });
  await prisma.income.deleteMany({ where: { userId: user.id } });
  await prisma.resource.deleteMany({ where: { userId: user.id } });
  await prisma.jobApplication.deleteMany({ where: { userId: user.id } });
  await prisma.project.deleteMany({ where: { userId: user.id } });
  await prisma.engineeringTrack.deleteMany({ where: { userId: user.id } });
  await prisma.language.deleteMany({ where: { userId: user.id } });
  await prisma.journalEntry.deleteMany({ where: { userId: user.id } });
  await prisma.note.deleteMany({ where: { userId: user.id } });
  await prisma.habit.deleteMany({ where: { userId: user.id } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });

  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        title: "Spanish B1",
        category: LifeAreaKey.LANGUAGES,
        priority: Priority.HIGH,
        progress: 65,
        deadline: date("2026-10-01"),
        status: GoalStatus.IN_PROGRESS,
      },
      {
        userId: user.id,
        title: "English B1",
        category: LifeAreaKey.LANGUAGES,
        priority: Priority.MEDIUM,
        progress: 60,
        deadline: date("2026-11-01"),
        status: GoalStatus.IN_PROGRESS,
      },
      {
        userId: user.id,
        title: "MERN Stack Job Ready",
        category: LifeAreaKey.ENGINEERING,
        priority: Priority.CRITICAL,
        progress: 70,
        deadline: date("2026-09-15"),
        status: GoalStatus.IN_PROGRESS,
      },
      {
        userId: user.id,
        title: "Build Strong Portfolio",
        category: LifeAreaKey.CAREER,
        priority: Priority.HIGH,
        progress: 55,
        deadline: date("2026-09-30"),
        status: GoalStatus.IN_PROGRESS,
      },
      {
        userId: user.id,
        title: "Get First Income",
        category: LifeAreaKey.INCOME,
        priority: Priority.CRITICAL,
        progress: 45,
        deadline: date("2026-10-15"),
        status: GoalStatus.IN_PROGRESS,
      },
    ],
  });

  await prisma.task.createMany({
    data: Array.from({ length: 60 }, (_, i) => ({
      userId: user.id,
      title: i < 42 ? `Completed task ${i + 1}` : `Pending task ${i + 1}`,
      status:
        i < 42
          ? TaskStatus.DONE
          : i < 52
            ? TaskStatus.IN_PROGRESS
            : TaskStatus.PENDING,
      priority: i % 4 === 0 ? Priority.HIGH : Priority.MEDIUM,
      completedAt: i < 42 ? date("2026-08-06") : null,
      createdAt: date("2026-07-01"),
    })),
  });

  const habitSeed = [
    ["Prayer", "🕌", [1, 1, 1, 1, 1, 1, 1]],
    ["Workout", "🏋️", [1, 1, 0, 0, 1, 1, 0]],
    ["Language Study", "🗣️", [1, 1, 1, 1, 1, 0, 1]],
    ["Reading", "📖", [1, 0, 1, 1, 0, 1, 1]],
    ["Deep Reflection", "🧘", [1, 1, 0, 0, 0, 0, 1]],
    ["Water 2L", "💧", [1, 1, 1, 1, 1, 0, 1]],
    ["No Social Media", "🚫", [0, 0, 0, 0, 0, 0, 0]],
  ] as const;
  for (const [index, [name, emoji, days]] of habitSeed.entries()) {
    const habit = await prisma.habit.create({
      data: { userId: user.id, name, emoji, target: 7 },
    });
    const heatmapLogs = Array.from({ length: 26 * 7 }, (_, offset) => {
      const dayIndex = offset % 7;
      const weekIndex = Math.floor(offset / 7);
      const logDate = new Date(Date.UTC(2026, 1, 9 + weekIndex * 7 + dayIndex));
      const base = days[dayIndex] === 1;
      const completed =
        weekIndex === 25
          ? days[dayIndex] === 1
          : base && ((weekIndex + index) % 5 !== 0 || dayIndex % 2 === 0);
      return { habitId: habit.id, date: logDate, completed };
    });
    await prisma.habitLog.createMany({ data: heatmapLogs });
  }

  await prisma.note.createMany({
    data: [
      {
        userId: user.id,
        title: "React Server Components",
        content:
          "# RSC notes\n\n- Render on the server\n- **Zero JS** shipped by default\n- Use `use client` to opt into interactivity",
        tag: "Engineering",
        pinned: true,
      },
      {
        userId: user.id,
        title: "Spanish subjunctive triggers",
        content:
          "## Triggers\n\n- Ojalá\n- Espero que\n- Es importante que\n\n*Practice 10 sentences daily.*",
        tag: "Spanish",
        pinned: true,
      },
      {
        userId: user.id,
        title: "Interview prep checklist",
        content:
          "1. STAR method examples\n2. Review job description\n3. Prepare 3 questions to ask",
        tag: "Career",
      },
      {
        userId: user.id,
        title: "Weekly review template",
        content:
          "## Wins\n\n- \n\n## Blockers\n\n- \n\n## Next week focus\n\n- ",
        tag: "Mindset",
      },
      {
        userId: user.id,
        title: "Quick note",
        content: "Focus on React this week",
        tag: "General",
      },
    ],
  });

  const languages = await Promise.all([
    prisma.language.create({
      data: {
        userId: user.id,
        code: "es",
        name: "Spanish",
        flag: "🇪🇸",
        currentLevel: "A2",
        targetLevel: "B1",
        percent: 65,
        vocabulary: 70,
        grammar: 60,
        listening: 55,
        speaking: 45,
        writing: 62,
        reading: 75,
        hoursLogged: 138,
        dailyGoalMinutes: 45,
        weeklyGoalHours: 6,
      },
    }),
    prisma.language.create({
      data: {
        userId: user.id,
        code: "en",
        name: "English",
        flag: "🇬🇧",
        currentLevel: "A2",
        targetLevel: "B1",
        percent: 60,
        vocabulary: 68,
        grammar: 58,
        listening: 65,
        speaking: 40,
        writing: 55,
        reading: 72,
        hoursLogged: 96,
        dailyGoalMinutes: 30,
        weeklyGoalHours: 4,
      },
    }),
  ]);
  const trends = [
    [50, 55, 60, 65],
    [45, 50, 55, 60],
  ];

  for (const [i, language] of languages.entries()) {
    await prisma.languageProgress.createMany({
      data: trends[i].map((score, j) => ({
        languageId: language.id,
        week: `W${j + 1}`,
        score,
        date: new Date(Date.UTC(2026, 6, 13 + j * 7)),
      })),
    });
  }

  await prisma.engineeringTrack.createMany({
    data: [
      {
        userId: user.id,
        key: "frontend",
        label: "Frontend (React/Next.js)",
        icon: "LayoutTemplate",
        percent: 68,
        status: "Good",
        tasksDone: 17,
        tasksTotal: 25,
      },
      {
        userId: user.id,
        key: "backend",
        label: "Backend (Node/Express)",
        icon: "Server",
        percent: 55,
        status: "Keep going",
        tasksDone: 11,
        tasksTotal: 20,
      },
      {
        userId: user.id,
        key: "database",
        label: "Database (MongoDB/Postgres)",
        icon: "Database",
        percent: 50,
        status: "Keep going",
        tasksDone: 10,
        tasksTotal: 20,
      },
      {
        userId: user.id,
        key: "devops",
        label: "Tools & DevOps (Git/Docker)",
        icon: "Boxes",
        percent: 40,
        status: "Start now",
        tasksDone: 6,
        tasksTotal: 15,
      },
      {
        userId: user.id,
        key: "dsa",
        label: "DSA & Algorithms",
        icon: "Binary",
        percent: 50,
        status: "Keep going",
        tasksDone: 15,
        tasksTotal: 30,
      },
    ],
  });

  await prisma.project.createMany({
    data: [
      {
        userId: user.id,
        name: "Phoenix Life OS Dashboard",
        technologies: ["Next.js", "TypeScript", "Tailwind"],
        progress: 60,
        status: GoalStatus.IN_PROGRESS,
      },
      {
        userId: user.id,
        name: "MERN Job Board",
        technologies: ["MongoDB", "Express", "React", "Node"],
        progress: 35,
        status: GoalStatus.IN_PROGRESS,
      },
      {
        userId: user.id,
        name: "Portfolio Website",
        technologies: ["Next.js", "Framer Motion"],
        progress: 80,
        status: GoalStatus.IN_PROGRESS,
      },
      {
        userId: user.id,
        name: "REST API + Auth",
        technologies: ["Node", "Express", "JWT"],
        progress: 20,
        status: GoalStatus.NOT_STARTED,
      },
    ],
  });

  await prisma.jobApplication.createMany({
    data: [
      {
        userId: user.id,
        company: "Nexora Labs",
        role: "Junior Full-Stack Dev",
        stage: JobStage.INTERVIEW,
        appliedOn: date("2026-07-20"),
      },
      {
        userId: user.id,
        company: "Remotely",
        role: "React Developer (Remote)",
        stage: JobStage.APPLIED,
        appliedOn: date("2026-07-28"),
      },
      {
        userId: user.id,
        company: "Atlas Software",
        role: "Frontend Engineer",
        stage: JobStage.APPLIED,
        appliedOn: date("2026-08-01"),
      },
      {
        userId: user.id,
        company: "Vertex Digital",
        role: "MERN Developer",
        stage: JobStage.REJECTED,
        appliedOn: date("2026-07-10"),
      },
    ],
  });

  await prisma.resource.createMany({
    data: [
      {
        userId: user.id,
        title: "The Odin Project — Full Stack Path",
        type: ResourceType.COURSE,
        progress: 45,
        tag: "Engineering",
      },
      {
        userId: user.id,
        title: "Dreaming Spanish — Comprehensible Input",
        type: ResourceType.VIDEO,
        progress: 60,
        tag: "Spanish",
      },
      {
        userId: user.id,
        title: "Atomic Habits — James Clear",
        type: ResourceType.BOOK,
        progress: 80,
        tag: "Mindset",
      },
      {
        userId: user.id,
        title: "MDN Web Docs — JavaScript",
        type: ResourceType.LINK,
        tag: "Engineering",
      },
      {
        userId: user.id,
        title: "freeCodeCamp — MERN Certification",
        type: ResourceType.CERTIFICATE,
        progress: 30,
        tag: "Engineering",
      },
      {
        userId: user.id,
        title: "English C1 Grammar Course",
        type: ResourceType.COURSE,
        progress: 20,
        tag: "English",
      },
    ],
  });

  await prisma.healthMetric.createMany({
    data: [
      {
        userId: user.id,
        date: date("2026-08-03"),
        weight: 78.4,
        sleep: 6.8,
        water: 1.9,
        steps: 7800,
        workouts: 1,
        heartRate: 66,
      },
      {
        userId: user.id,
        date: date("2026-08-04"),
        weight: 78.2,
        sleep: 7.1,
        water: 2.1,
        steps: 8200,
        workouts: 1,
        heartRate: 65,
      },
      {
        userId: user.id,
        date: date("2026-08-05"),
        weight: 78.0,
        sleep: 6.5,
        water: 2.0,
        steps: 7600,
        workouts: 0,
        heartRate: 64,
      },
      {
        userId: user.id,
        date: date("2026-08-06"),
        weight: 77.9,
        sleep: 7.4,
        water: 2.4,
        steps: 9100,
        workouts: 1,
        heartRate: 64,
      },
      {
        userId: user.id,
        date: date("2026-08-07"),
        weight: 77.8,
        sleep: 7.8,
        water: 2.3,
        steps: 9800,
        workouts: 1,
        heartRate: 63,
      },
      {
        userId: user.id,
        date: date("2026-08-08"),
        weight: 78.0,
        sleep: 8.1,
        water: 2.1,
        steps: 8400,
        workouts: 0,
        heartRate: 64,
      },
    ],
  });

  await prisma.income.createMany({
    data: [
      {
        userId: user.id,
        source: "Freelancing",
        amount: 1200,
        goal: 4000,
        type: IncomeType.FREELANCE,
        month: date("2026-08-01"),
      },
      {
        userId: user.id,
        source: "Remote Job",
        amount: 0,
        goal: 8000,
        type: IncomeType.REMOTE_JOB,
        month: date("2026-08-01"),
      },
      {
        userId: user.id,
        source: "Savings",
        amount: 3400,
        goal: 10000,
        type: IncomeType.SAVINGS,
        month: date("2026-08-01"),
      },
    ],
  });

  const daily = [
    ["2026-08-03", 55, 4],
    ["2026-08-04", 60, 4.5],
    ["2026-08-05", 65, 5.25],
    ["2026-08-06", 70, 4],
    ["2026-08-07", 82, 5],
    ["2026-08-08", 78, 3.5],
    ["2026-08-09", 85, 2.5],
  ];
  await prisma.dailyMetric.createMany({
    data: daily.map(([d, score, focusHours]) => ({
      userId: user.id,
      date: date(d as string),
      score: score as number,
      focusHours: focusHours as number,
      goalScore: 70,
    })),
  });

  await prisma.journalEntry.createMany({
    data: [
      {
        userId: user.id,
        date: date("2026-08-04"),
        title: "Steady progress",
        content:
          "Finished the React section and reviewed Spanish subjunctive. Felt focused most of the day.",
        mood: 4,
      },
      {
        userId: user.id,
        date: date("2026-08-03"),
        title: "Slow start",
        content:
          "Woke up late, but recovered with a solid evening study block.",
        mood: 3,
      },
      {
        userId: user.id,
        date: date("2026-08-02"),
        title: "Good momentum",
        content: "Shipped the dashboard layout and sent two job applications.",
        mood: 5,
      },
    ],
  });

  console.log("Phoenix Life OS seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
