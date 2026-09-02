import type { Task } from "@/generated/prisma/client";
import { APP_TIMEZONE, localDateKey } from "@/lib/dates";

type SelectionTask = Pick<Task, "id" | "title" | "status" | "priority" | "dueDate" | "createdAt">;
const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function selectNextTask<T extends SelectionTask>(tasks: readonly T[]): T | null {
  const active = tasks.filter((task) => task.status === "IN_PROGRESS" || task.status === "PENDING");
  active.sort((a, b) => {
    const status = Number(a.status !== "IN_PROGRESS") - Number(b.status !== "IN_PROGRESS");
    if (status) return status;
    // Ascending instants put overdue dates before upcoming dates, then undated
    // work. Do not mutate the shared array used by other Overview surfaces.
    const dueA = a.dueDate?.getTime() ?? Infinity;
    const dueB = b.dueDate?.getTime() ?? Infinity;
    if (dueA !== dueB) return dueA < dueB ? -1 : 1;
    const priority = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priority) return priority;
    const age = a.createdAt.getTime() - b.createdAt.getTime();
    if (age) return age;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return active[0] ?? null;
}

export function taskDueState(dueDate: Date | null, now = new Date()) {
  if (!dueDate) return { label: null, overdue: false };
  const dueDay = localDateKey(dueDate);
  const today = localDateKey(now);
  // A date on today's Casablanca calendar is "Due today", not a warning
  // based on UTC midnight or an already elapsed hour of the same day.
  if (dueDay === today) return { label: "Due today", overdue: false };
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric",
  }).format(dueDate);
  return { label: `${dueDay < today ? "Overdue" : "Due"} · ${date}`, overdue: dueDay < today };
}

export function getNextAction(tasks: readonly SelectionTask[], now = new Date()) {
  const task = selectNextTask(tasks);
  if (!task || task.status === "DONE") return null;
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due: taskDueState(task.dueDate, now),
  };
}

// A serializable view of the existing Task, not a second persisted model.
export type NextActionData = ReturnType<typeof getNextAction>;
