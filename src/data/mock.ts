import type {
  User,
  LifeArea,
  KpiMetric,
  Mission,
  WeeklyPoint,
  FocusBar,
  TaskStatusSlice,
  HabitRow,
  MonthlyWeek,
  NoteItem,
  LanguageProgress,
  EngineeringTrack,
  EngineeringProject,
  JobApplication,
  IncomeSource,
  HealthMetric,
  MoodEntry,
  JournalEntry,
  ResourceItem,
} from "@/types";

export const user: User = {
  id: "u1",
  name: "Youssef",
  timezone: "Africa/Casablanca",
  streakDays: 17,
  memberSince: "2026-01-12",
};

export const lifeAreas: LifeArea[] = [
  {
    key: "languages",
    label: "Languages",
    percent: 65,
    status: "Good",
    color: "var(--accent-blue)",
    icon: "MessageCircle",
  },
  {
    key: "engineering",
    label: "Engineering",
    percent: 70,
    status: "Great",
    color: "var(--accent-purple)",
    icon: "Code2",
  },
  {
    key: "career",
    label: "Career",
    percent: 60,
    status: "Good",
    color: "var(--accent-pink)",
    icon: "Briefcase",
  },
  {
    key: "income",
    label: "Income",
    percent: 45,
    status: "Keep going",
    color: "var(--warning)",
    icon: "CircleDollarSign",
  },
  {
    key: "health",
    label: "Health",
    percent: 75,
    status: "Great",
    color: "var(--success)",
    icon: "HeartPulse",
  },
  {
    key: "mindset",
    label: "Mindset",
    percent: 68,
    status: "Good",
    color: "#b58bff",
    icon: "BrainCircuit",
  },
];

export const kpis: KpiMetric[] = [
  {
    id: "overall",
    label: "Overall Progress",
    value: "64",
    unit: "%",
    icon: "Target",
    deltaLabel: "Good progress",
    deltaPositive: true,
    trend: [40, 44, 48, 52, 55, 60, 64],
  },
  {
    id: "weekly-score",
    label: "Weekly Score",
    value: "82",
    unit: "/100",
    icon: "Gauge",
    deltaLabel: "+12 vs last week",
    deltaPositive: true,
    trend: [60, 65, 70, 68, 74, 78, 82],
  },
  {
    id: "focus-time",
    label: "Focus Time",
    value: "28h 45m",
    icon: "Clock",
    deltaLabel: "+4h 15m vs last week",
    deltaPositive: true,
    trend: [3, 4, 5, 4, 5.5, 6, 4.5],
  },
  {
    id: "tasks",
    label: "Tasks Completed",
    value: "42",
    unit: "/60",
    icon: "CheckCircle2",
    deltaLabel: "70% completion",
    deltaPositive: true,
    trend: [4, 6, 8, 5, 7, 6, 6],
  },
  {
    id: "consistency",
    label: "Consistency",
    value: "87",
    unit: "%",
    icon: "CalendarCheck",
    deltaLabel: "Keep it up!",
    deltaPositive: true,
    trend: [70, 75, 80, 78, 82, 85, 87],
  },
  {
    id: "days-on-track",
    label: "Days On Track",
    value: "24",
    unit: "/30",
    icon: "TrendingUp",
    deltaLabel: "80% of month",
    deltaPositive: true,
    trend: [10, 14, 16, 18, 20, 22, 24],
  },
];

export const missions: Mission[] = [
  {
    id: "m1",
    title: "Spanish B1",
    category: "languages",
    priority: "high",
    progress: 65,
    deadline: "2026-10-01",
    status: "in-progress",
  },
  {
    id: "m2",
    title: "English B1",
    category: "languages",
    priority: "medium",
    progress: 60,
    deadline: "2026-11-01",
    status: "in-progress",
  },
  {
    id: "m3",
    title: "MERN Stack Job Ready",
    category: "engineering",
    priority: "critical",
    progress: 70,
    deadline: "2026-09-15",
    status: "in-progress",
  },
  {
    id: "m4",
    title: "Build Strong Portfolio",
    category: "career",
    priority: "high",
    progress: 55,
    deadline: "2026-09-30",
    status: "in-progress",
  },
  {
    id: "m5",
    title: "Get First Income",
    category: "income",
    priority: "critical",
    progress: 45,
    deadline: "2026-10-15",
    status: "in-progress",
  },
];

export const weeklyProgress: WeeklyPoint[] = [
  { day: "Mon", score: 55, goal: 70 },
  { day: "Tue", score: 60, goal: 70 },
  { day: "Wed", score: 65, goal: 70 },
  { day: "Thu", score: 70, goal: 70 },
  { day: "Fri", score: 82, goal: 70 },
  { day: "Sat", score: 78, goal: 70 },
  { day: "Sun", score: 85, goal: 70 },
];

export const focusTime: FocusBar[] = [
  { day: "Mon", hours: 4 },
  { day: "Tue", hours: 4.5 },
  { day: "Wed", hours: 5.25 },
  { day: "Thu", hours: 4 },
  { day: "Fri", hours: 5 },
  { day: "Sat", hours: 3.5 },
  { day: "Sun", hours: 2.5 },
];

export const taskStatus: TaskStatusSlice[] = [
  { name: "Done", value: 26, color: "var(--success)" },
  { name: "In Progress", value: 10, color: "var(--accent-blue)" },
  { name: "Pending", value: 6, color: "var(--warning)" },
];

export const habits: HabitRow[] = [
  {
    id: "h1",
    label: "Prayer",
    emoji: "🕌",
    days: [true, true, true, true, true, true, true],
  },
  {
    id: "h2",
    label: "Workout",
    emoji: "🏋️",
    days: [true, true, false, false, true, true, false],
  },
  {
    id: "h3",
    label: "Language Study",
    emoji: "🗣️",
    days: [true, true, true, true, true, false, true],
  },
  {
    id: "h4",
    label: "Reading",
    emoji: "📖",
    days: [true, false, true, true, false, true, true],
  },
  {
    id: "h5",
    label: "Deep Reflection",
    emoji: "🧘",
    days: [true, true, false, false, false, false, true],
  },
  {
    id: "h6",
    label: "Water 2L",
    emoji: "💧",
    days: [true, true, true, true, true, false, true],
  },
  {
    id: "h7",
    label: "No Social Media",
    emoji: "🚫",
    days: [false, false, false, false, false, false, false],
  },
];

export const monthlyProgress: MonthlyWeek[] = [
  { label: "Week 1", score: 62 },
  { label: "Week 2", score: 68 },
  { label: "Week 3", score: 71 },
  { label: "Week 4", score: 82 },
  { label: "Week 5", score: null },
];

export const quickNotes: NoteItem[] = [
  { id: "n1", text: "Focus on React this week" },
  { id: "n2", text: "Improve Spanish speaking" },
  { id: "n3", text: "Apply to 5 jobs every week" },
  { id: "n4", text: "Build Project #2" },
  { id: "n5", text: "Wake up at 6:00 AM" },
];

export const languages: LanguageProgress[] = [
  {
    id: "es",
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
    weeklyTrend: [
      { week: "W1", score: 50 },
      { week: "W2", score: 55 },
      { week: "W3", score: 60 },
      { week: "W4", score: 65 },
    ],
    studySessions: [],
  },
  {
    id: "en",
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
    weeklyTrend: [
      { week: "W1", score: 45 },
      { week: "W2", score: 50 },
      { week: "W3", score: 55 },
      { week: "W4", score: 60 },
    ],
    studySessions: [],
  },
];

export const engineeringTracks: EngineeringTrack[] = [
  {
    id: "frontend",
    label: "Frontend (React/Next.js)",
    icon: "LayoutTemplate",
    percent: 68,
    status: "Good",
    tasksDone: 17,
    tasksTotal: 25,
  },
  {
    id: "backend",
    label: "Backend (Node/Express)",
    icon: "Server",
    percent: 55,
    status: "Keep going",
    tasksDone: 11,
    tasksTotal: 20,
  },
  {
    id: "database",
    label: "Database (MongoDB/Postgres)",
    icon: "Database",
    percent: 50,
    status: "Keep going",
    tasksDone: 10,
    tasksTotal: 20,
  },
  {
    id: "devops",
    label: "Tools & DevOps (Git/Docker)",
    icon: "Boxes",
    percent: 40,
    status: "Start now",
    tasksDone: 6,
    tasksTotal: 15,
  },
  {
    id: "dsa",
    label: "DSA & Algorithms",
    icon: "Binary",
    percent: 50,
    status: "Keep going",
    tasksDone: 15,
    tasksTotal: 30,
  },
];

export const engineeringProjects: EngineeringProject[] = [
  {
    id: "p1",
    name: "Phoenix Life OS Dashboard",
    stack: ["Next.js", "TypeScript", "Tailwind"],
    progress: 60,
    status: "in-progress",
  },
  {
    id: "p2",
    name: "MERN Job Board",
    stack: ["MongoDB", "Express", "React", "Node"],
    progress: 35,
    status: "in-progress",
  },
  {
    id: "p3",
    name: "Portfolio Website",
    stack: ["Next.js", "Framer Motion"],
    progress: 80,
    status: "in-progress",
  },
  {
    id: "p4",
    name: "REST API + Auth",
    stack: ["Node", "Express", "JWT"],
    progress: 20,
    status: "not-started",
  },
];

export const jobApplications: JobApplication[] = [
  {
    id: "j1",
    company: "Nexora Labs",
    role: "Junior Full-Stack Dev",
    stage: "interview",
    appliedOn: "2026-07-20",
  },
  {
    id: "j2",
    company: "Remotely",
    role: "React Developer (Remote)",
    stage: "applied",
    appliedOn: "2026-07-28",
  },
  {
    id: "j3",
    company: "Atlas Software",
    role: "Frontend Engineer",
    stage: "applied",
    appliedOn: "2026-08-01",
  },
  {
    id: "j4",
    company: "Vertex Digital",
    role: "MERN Developer",
    stage: "rejected",
    appliedOn: "2026-07-10",
  },
];

export const incomeSources: IncomeSource[] = [
  {
    id: "i1",
    label: "Freelancing",
    amount: 1200,
    goal: 4000,
    type: "freelance",
  },
  { id: "i2", label: "Remote Job", amount: 0, goal: 8000, type: "remote-job" },
  { id: "i3", label: "Savings", amount: 3400, goal: 10000, type: "savings" },
];

export const healthMetrics: HealthMetric[] = [
  {
    id: "weight",
    label: "Weight",
    value: "78 kg",
    goal: "72 kg",
    percent: 55,
    icon: "Scale",
  },
  {
    id: "sleep",
    label: "Sleep",
    value: "7.2h",
    goal: "8h",
    percent: 90,
    icon: "Moon",
  },
  {
    id: "water",
    label: "Water",
    value: "2.1L",
    goal: "3L",
    percent: 70,
    icon: "Droplets",
  },
  {
    id: "steps",
    label: "Steps",
    value: "8,400",
    goal: "10,000",
    percent: 84,
    icon: "Footprints",
  },
  {
    id: "workout",
    label: "Workouts",
    value: "4",
    goal: "5 / week",
    percent: 80,
    icon: "Dumbbell",
  },
  {
    id: "heart",
    label: "Resting HR",
    value: "64 bpm",
    goal: "60 bpm",
    percent: 65,
    icon: "HeartPulse",
  },
];

export const moodTrend: MoodEntry[] = [
  { day: "Mon", mood: 3 },
  { day: "Tue", mood: 4 },
  { day: "Wed", mood: 3 },
  { day: "Thu", mood: 4 },
  { day: "Fri", mood: 5 },
  { day: "Sat", mood: 4 },
  { day: "Sun", mood: 4 },
];

export const journalEntries: JournalEntry[] = [
  {
    id: "j1",
    date: "2026-08-04",
    title: "Steady progress",
    excerpt:
      "Finished the React section and reviewed Spanish subjunctive. Felt focused most of the day.",
    mood: 4,
  },
  {
    id: "j2",
    date: "2026-08-03",
    title: "Slow start",
    excerpt: "Woke up late, but recovered with a solid evening study block.",
    mood: 3,
  },
  {
    id: "j3",
    date: "2026-08-02",
    title: "Good momentum",
    excerpt: "Shipped the dashboard layout and sent two job applications.",
    mood: 5,
  },
];

export const resources: ResourceItem[] = [
  {
    id: "r1",
    title: "The Odin Project — Full Stack Path",
    type: "course",
    progress: 45,
    tag: "Engineering",
  },
  {
    id: "r2",
    title: "Dreaming Spanish — Comprehensible Input",
    type: "video",
    progress: 60,
    tag: "Spanish",
  },
  {
    id: "r3",
    title: "Atomic Habits — James Clear",
    type: "book",
    progress: 80,
    tag: "Mindset",
  },
  {
    id: "r4",
    title: "MDN Web Docs — JavaScript",
    type: "link",
    tag: "Engineering",
  },
  {
    id: "r5",
    title: "freeCodeCamp — MERN Certification",
    type: "certificate",
    progress: 30,
    tag: "Engineering",
  },
  {
    id: "r6",
    title: "English C1 Grammar Course",
    type: "course",
    progress: 20,
    tag: "English",
  },
];
