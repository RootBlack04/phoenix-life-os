"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createHealthMetric,
  createIncome,
  createJournalEntry,
  createLanguageStudySession,
  createResource,
  deleteResource,
  setResourceCompleted as updateResourceCompleted,
  updateResourceProgress,
  updateSettings,
  updateUserProfile,
  createNote,
  deleteNote,
  toggleHabit,
  updateJobStage,
  updateLanguageSkills,
  updateNote,
  updateProjectProgress,
} from "@/lib/db";

const noteSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Title is required").max(120),
  content: z.string().max(20_000),
  tag: z.string().trim().min(1, "Tag is required").max(40),
  pinned: z.boolean(),
});

const habitSchema = z.object({
  habitId: z.string(),
  date: z.string(),
  completed: z.boolean(),
});

const jobSchema = z.object({
  id: z.string(),
  stage: z.enum(["APPLIED", "INTERVIEW", "OFFER", "REJECTED"]),
});

const projectSchema = z.object({
  id: z.string(),
  progress: z.number().int().min(0).max(100),
});

const incomeSchema = z.object({
  source: z.string().min(1),
  amount: z.number().nonnegative(),
  goal: z.number().nonnegative().optional(),
  type: z.enum(["FREELANCE", "REMOTE_JOB", "SAVINGS", "OTHER"]),
  month: z.coerce.date(),
});

const healthSchema = z.object({
  date: z.coerce.date(),
  weight: z.number().positive().optional(),
  sleep: z.number().nonnegative().optional(),
  water: z.number().nonnegative().optional(),
  steps: z.number().int().nonnegative().optional(),
  workouts: z.number().int().nonnegative().optional(),
  heartRate: z.number().int().positive().optional(),
});

const resourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.enum(["BOOK", "COURSE", "VIDEO", "LINK", "CERTIFICATE"]),
  progress: z.number().int().min(0).max(100).optional(),
  tag: z.string().trim().min(1, "Tag is required").max(40),
  url: z.string().url().optional().or(z.literal("")),
});

const resourceProgressSchema = z.object({
  id: z.string(),
  progress: z.number().int().min(0).max(100),
});

const resourceCompletedSchema = z.object({
  id: z.string(),
  completed: z.boolean(),
});

const languageStudySessionSchema = z.object({
  languageId: z.string(),
  date: z.coerce.date(),
  minutes: z.number().int().positive().max(1440),
  skill: z.enum([
    "vocabulary",
    "grammar",
    "listening",
    "speaking",
    "writing",
    "reading",
  ]),
  note: z.string().max(500).optional(),
});

const languageSkillsSchema = z.object({
  id: z.string(),
  percent: z.number().int().min(0).max(100),
  vocabulary: z.number().int().min(0).max(100),
  grammar: z.number().int().min(0).max(100),
  listening: z.number().int().min(0).max(100),
  speaking: z.number().int().min(0).max(100),
  writing: z.number().int().min(0).max(100),
  reading: z.number().int().min(0).max(100),
});

const journalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  content: z.string().trim().min(1, "Content is required").max(20_000),
  mood: z.number().int().min(1).max(5),
  date: z.coerce.date(),
});

/* -------------------------------------------------------------------------- */
/* Notes                                                                      */
/* -------------------------------------------------------------------------- */

export async function saveNote(input: z.input<typeof noteSchema>) {
  const data = noteSchema.parse(input);

  const { id, ...noteData } = data;

  const note = id ? await updateNote(id, noteData) : await createNote(noteData);

  revalidatePath("/notes");
  revalidatePath("/");

  return note;
}

export async function removeNote(id: string) {
  await deleteNote(z.string().parse(id));

  revalidatePath("/notes");
  revalidatePath("/");
}

/* -------------------------------------------------------------------------- */
/* Habits                                                                     */
/* -------------------------------------------------------------------------- */

export async function setHabit(input: z.input<typeof habitSchema>) {
  const data = habitSchema.parse(input);

  await toggleHabit(data.habitId, data.date, data.completed);

  revalidatePath("/habits");
  revalidatePath("/");
}

/* -------------------------------------------------------------------------- */
/* Career                                                                     */
/* -------------------------------------------------------------------------- */

export async function setJobStage(input: z.input<typeof jobSchema>) {
  const data = jobSchema.parse(input);

  await updateJobStage(data.id, data.stage);

  revalidatePath("/career");
  revalidatePath("/");
}

/* -------------------------------------------------------------------------- */
/* Mindset                                                                    */
/* -------------------------------------------------------------------------- */

export async function addJournalEntry(input: z.input<typeof journalSchema>) {
  const data = journalSchema.parse(input);

  await createJournalEntry(data);

  revalidatePath("/mindset");
  revalidatePath("/");

  return;
}

/* -------------------------------------------------------------------------- */
/* Languages                                                                  */
/* -------------------------------------------------------------------------- */

export async function addLanguageStudySession(
  input: z.input<typeof languageStudySessionSchema>,
) {
  const data = languageStudySessionSchema.parse(input);

  await createLanguageStudySession(data);

  revalidatePath("/languages");
  revalidatePath("/");
}

export async function setLanguageSkills(
  input: z.input<typeof languageSkillsSchema>,
) {
  const data = languageSkillsSchema.parse(input);

  await updateLanguageSkills(data.id, {
    percent: data.percent,
    vocabulary: data.vocabulary,
    grammar: data.grammar,
    listening: data.listening,
    speaking: data.speaking,
    writing: data.writing,
    reading: data.reading,
  });

  revalidatePath("/languages");
  revalidatePath("/");
}

/* -------------------------------------------------------------------------- */
/* Engineering                                                                */
/* -------------------------------------------------------------------------- */

export async function setProjectProgress(input: z.input<typeof projectSchema>) {
  const data = projectSchema.parse(input);

  await updateProjectProgress(data.id, data.progress);

  revalidatePath("/engineering");
  revalidatePath("/");
}

/* -------------------------------------------------------------------------- */
/* Income                                                                     */
/* -------------------------------------------------------------------------- */

export async function addIncome(input: z.input<typeof incomeSchema>) {
  const data = incomeSchema.parse(input);

  await createIncome(data);

  revalidatePath("/income");
  revalidatePath("/");
}

/* -------------------------------------------------------------------------- */
/* Resources                                                                  */
/* -------------------------------------------------------------------------- */

export async function addResource(input: z.input<typeof resourceSchema>) {
  const data = resourceSchema.parse(input);

  await createResource({
    ...data,
    url: data.url || undefined,
  });

  revalidatePath("/resources");
  revalidatePath("/");
}

export async function setResourceProgress(
  input: z.input<typeof resourceProgressSchema>,
) {
  const data = resourceProgressSchema.parse(input);

  await updateResourceProgress(data.id, data.progress);

  revalidatePath("/resources");
  revalidatePath("/");
}

export async function setResourceCompleted(
  input: z.input<typeof resourceCompletedSchema>,
) {
  const data = resourceCompletedSchema.parse(input);

  await updateResourceCompleted(data.id, data.completed);

  revalidatePath("/resources");
  revalidatePath("/");
}

export async function removeResource(id: string) {
  await deleteResource(z.string().parse(id));

  revalidatePath("/resources");
  revalidatePath("/");
}

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

export async function saveHealth(input: z.input<typeof healthSchema>) {
  const data = healthSchema.parse(input);

  await createHealthMetric(data);

  revalidatePath("/health");
  revalidatePath("/");
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(100),

  theme: z.enum(["AURORA", "SUNSET", "FOREST"]),

  sidebarCollapsed: z.boolean(),

  dailyMissionReminders: z.boolean(),
  weeklyReviewEmail: z.boolean(),
  habitStreakAlerts: z.boolean(),
  jobApplicationFollowUps: z.boolean(),

  weeklyFocusHours: z.number().int().min(0).max(168),
  weeklyScoreGoal: z.number().int().min(0).max(100),

  language: z.enum(["ENGLISH", "SPANISH", "FRENCH", "ARABIC"]),
});

export async function saveSettings(input: z.input<typeof settingsSchema>) {
  const data = settingsSchema.parse(input);

  await updateUserProfile({
    name: data.name,
    timezone: data.timezone,
  });

  await updateSettings({
    theme: data.theme,
    sidebarCollapsed: data.sidebarCollapsed,
    dailyMissionReminders: data.dailyMissionReminders,
    weeklyReviewEmail: data.weeklyReviewEmail,
    habitStreakAlerts: data.habitStreakAlerts,
    jobApplicationFollowUps: data.jobApplicationFollowUps,
    weeklyFocusHours: data.weeklyFocusHours,
    weeklyScoreGoal: data.weeklyScoreGoal,
    language: data.language,
  });

  revalidatePath("/settings");
  revalidatePath("/");

  return;
}
