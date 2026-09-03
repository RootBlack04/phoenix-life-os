"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { JobStage, LifeAreaKey } from "@/generated/prisma/enums";
import { dateFromKey, localDateKey, localMidnight } from "@/lib/dates";

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
  createJobApplication,
  createGoal,
  updateGoal,
  completeGoal,
  reopenGoal,
  updateLanguageSkills,
  updateNote,
  updateProjectProgress,
  createTask,
  updateTaskStatus,
} from "@/lib/db";

const noteSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Title is required").max(120),
  content: z.string().max(20_000),
  tag: z.string().trim().min(1, "Tag is required").max(40),
  pinned: z.boolean(),
});

const goalFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().transform((value) => value || null),
  progress: z.number().int().min(0).max(100),
  deadline: z.iso.date().nullable().optional().transform((day) => day ? localMidnight(day) : null),
});
const createGoalSchema = goalFieldsSchema.extend({ category: z.enum(LifeAreaKey) });
const updateGoalSchema = goalFieldsSchema.extend({ id: z.string().trim().min(1) });

export async function addGoal(input: z.input<typeof createGoalSchema>) {
  const goal = await createGoal(createGoalSchema.parse(input));
  revalidatePath("/");
  revalidatePath("/goals");
  return goal;
}

export async function saveGoal(input: z.input<typeof updateGoalSchema>) {
  const { id, ...data } = updateGoalSchema.parse(input);
  const goal = await updateGoal(id, data);
  revalidatePath("/");
  revalidatePath("/goals");
  return goal;
}

export async function markGoalComplete(id: string) {
  const goal = await completeGoal(z.string().trim().min(1).parse(id));
  revalidatePath("/");
  revalidatePath("/goals");
  return goal;
}

export async function reopenCompletedGoal(id: string) {
  const goal = await reopenGoal(z.string().trim().min(1).parse(id));
  revalidatePath("/");
  revalidatePath("/goals");
  return goal;
}

const habitSchema = z.object({
  habitId: z.string(),
  date: z.string(),
  completed: z.boolean(),
});

const jobSchema = z.object({
  id: z.string(),
  stage: z.enum(JobStage),
});

const createJobApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  role: z.string().trim().min(1, "Role is required").max(200),
  stage: z.enum(JobStage).default(JobStage.APPLIED),
  // Validate the calendar label before converting it to a local-day instant.
  appliedOn: z.iso.date().transform((day) => localMidnight(day)),
});

const projectSchema = z.object({
  id: z.string(),
  progress: z.number().int().min(0).max(100),
});

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2_000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate: z.coerce.date().optional(),
});

const taskStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]),
  expectedStatus: z.enum(["PENDING", "IN_PROGRESS"]).optional(),
});

const incomeSchema = z.object({
  source: z.string().min(1),
  amount: z.number().nonnegative(),
  goal: z.number().nonnegative().optional(),
  type: z.enum(["FREELANCE", "REMOTE_JOB", "SAVINGS", "OTHER"]),
  month: z.coerce.date(),
});

const healthSchema = z.object({
  date: z.iso.date().refine((day) => day <= localDateKey(new Date()), "Future health dates are not allowed").transform(dateFromKey),
  weight: z.number().positive().nullable().optional(),
  sleep: z.number().nonnegative().nullable().optional(),
  water: z.number().nonnegative().nullable().optional(),
  steps: z.number().int().nonnegative().nullable().optional(),
  workouts: z.number().int().nonnegative().nullable().optional(),
  heartRate: z.number().int().positive().nullable().optional(),
}).refine((data) => [data.weight, data.sleep, data.water, data.steps, data.workouts, data.heartRate].some((value) => value !== undefined), "Change at least one measurement");

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

export async function addJobApplication(input: z.input<typeof createJobApplicationSchema>) {
  const data = createJobApplicationSchema.parse(input);
  const application = await createJobApplication(data);
  revalidatePath("/career");
  revalidatePath("/");
  return application;
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
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

export async function addTask(input: z.input<typeof createTaskSchema>) {
  const data = createTaskSchema.parse(input);

  const task = await createTask({
    title: data.title,
    description: data.description || undefined,
    priority: data.priority,
    dueDate: data.dueDate,
  });

  revalidatePath("/");
  revalidatePath("/tasks");
  return task;
}

export async function setTaskStatus(
  input: z.input<typeof taskStatusSchema>,
) {
  const data = taskStatusSchema.parse(input);

  const task = await updateTaskStatus(data.id, data.status, data.expectedStatus);

  revalidatePath("/");
  revalidatePath("/tasks");
  return task;
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
  sidebarCollapsed: z.boolean(),
});

export async function saveSettings(input: z.input<typeof settingsSchema>) {
  const data = settingsSchema.parse(input);

  // Write only exposed controls; never replay hidden values from a stale tab.
  await updateUserProfile({ name: data.name });
  await updateSettings({ sidebarCollapsed: data.sidebarCollapsed });

  revalidatePath("/settings");
  revalidatePath("/");

  return;
}
