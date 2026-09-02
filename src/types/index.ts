// ── Core domain types for Phoenix Life OS ───────────────────────────────
// These mirror a scalable schema: User -> Domains -> {Goals, Habits, Tasks,
// Projects, Learning, Resources} with dedicated per-domain shapes for
// Career, Income, Health, Languages, Mindset, Notes and Settings.

export type LifeAreaKey =
  | "languages"
  | "engineering"
  | "career"
  | "income"
  | "health"
  | "mindset";

export type Status = "not-started" | "in-progress" | "done" | "blocked";
export type Priority = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  timezone: string;
  streakDays: number;
  memberSince: string;
}

export interface LifeArea {
  key: LifeAreaKey;
  label: string;
  percent: number | null;
  status: string;
  color: string;
  icon: string;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  unit?: string;
  icon: string;
  deltaLabel: string;
  deltaPositive: boolean;
  trend: number[];
}

export interface Mission {
  id: string;
  title: string;
  category: LifeAreaKey;
  priority: Priority;
  progress: number;
  deadline: string | null;
  status: Status;
}

export interface WeeklyPoint {
  day: string;
  score: number;
  goal: number;
}

export interface FocusBar {
  day: string;
  hours: number;
}

export interface TaskStatusSlice {
  name: string;
  value: number;
  color: string;
}

export interface HabitRow {
  id: string;
  label: string;
  emoji: string;
  days: boolean[]; // Mon..Sun
}

export interface MonthlyWeek {
  label: string;
  score: number | null;
}

export interface NoteItem {
  id: string;
  text: string;
}

export interface LanguageProgress {
  id: string;
  name: string;
  flag: string;
  currentLevel: string;
  targetLevel: string;
  percent: number;
  vocabulary: number;
  grammar: number;
  listening: number;
  speaking: number;
  writing: number;
  reading: number;
  hoursLogged: number;
  dailyGoalMinutes: number;
  weeklyGoalHours: number;
  weeklyTrend: { week: string; score: number }[];
  studySessions: LanguageStudySession[];
}

export interface LanguageStudySession {
  id: string;
  date: string;
  minutes: number;
  skill: string;
  note?: string | null;
}

export interface EngineeringTrack {
  id: string;
  label: string;
  icon: string;
  percent: number;
  status: string;
  tasksDone: number;
  tasksTotal: number;
}

export interface EngineeringProject {
  id: string;
  name: string;
  stack: string[];
  progress: number;
  status: Status;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  stage: "applied" | "interview" | "offer" | "rejected";
  appliedOn: string;
}

export interface IncomeSource {
  id: string;
  label: string;
  amount: number;
  goal: number;
  type: "freelance" | "remote-job" | "savings" | "other";
}

export interface HealthMetric {
  id: string;
  label: string;
  value: string;
  goal: string;
  percent: number;
  icon: string;
}

export interface MoodEntry {
  day: string;
  mood: number; // 1-5
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  mood: number;
}

export interface ResourceItem {
  id: string;
  title: string;
  type: "book" | "course" | "video" | "link" | "certificate";
  progress?: number;
  tag: string;
}
