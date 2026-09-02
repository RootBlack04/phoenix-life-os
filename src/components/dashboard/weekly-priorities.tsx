"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Code2,
  Dumbbell,
  Languages,
  Brain,
  ListChecks,
  Loader2,
  Play,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import type { WeeklyPriority, WeeklyPlan } from "@/lib/analytics/planning";
import { addTask, setTaskStatus } from "@/lib/db/actions";
import { matchesPriorityTask } from "@/lib/analytics/priority-task";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";

type DashboardTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

const domainMeta: Record<
  WeeklyPriority["domain"],
  { label: string; icon: typeof ListChecks }
> = {
  habits: { label: "Habits", icon: ListChecks },
  languages: { label: "Languages", icon: Languages },
  engineering: { label: "Engineering", icon: Code2 },
  career: { label: "Career", icon: BriefcaseBusiness },
  health: { label: "Health", icon: Dumbbell },
  mindset: { label: "Mindset", icon: Brain },
};

const priorityMeta = {
  high: {
    label: "HIGH",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  medium: {
    label: "MEDIUM",
    className: "border-white/10 bg-white/5 text-text-secondary",
  },
  low: {
    label: "LOW",
    className: "border-white/10 bg-white/5 text-text-tertiary",
  },
} as const;

const taskStatusMeta: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "PENDING",
    className: "border-white/10 bg-white/5 text-text-secondary",
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    className:
      "border-accent-blue/20 bg-accent-blue/10 text-accent-blue-soft",
  },
  DONE: {
    label: "DONE",
    className: "border-success/20 bg-success/10 text-success",
  },
};

function taskTitleForPriority(priority: WeeklyPriority) {
  return priority.action ?? priority.title;
}

function findTaskForPriority(
  priority: WeeklyPriority,
  tasks: DashboardTask[],
) {
  const title = taskTitleForPriority(priority);

  /*
   * v1 has no dedicated priority/task relation in Prisma yet.
   * Use title + explanation template, ignoring changing numeric evidence.
   * Overview supplies only owned, active-week tasks, ordered newest-first; if
   * duplicate tasks exist, the latest matching task is displayed.
   */
  return tasks.find(
    (task) =>
      matchesPriorityTask(task, title, priority.reason),
  );
}

export function WeeklyPriorities({
  plan,
  tasks,
}: {
  plan: WeeklyPlan;
  tasks: DashboardTask[];
}) {
  const router = useRouter();
  const [pendingPriorityId, setPendingPriorityId] = useState<string | null>(
    null,
  );
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreateTask(priority: WeeklyPriority) {
    setError(null);
    setPendingPriorityId(priority.insightId);

    startTransition(async () => {
      try {
        await addTask({
          title: taskTitleForPriority(priority),
          description: priority.reason,
          priority:
            priority.priority === "high"
              ? "HIGH"
              : priority.priority === "medium"
                ? "MEDIUM"
                : "LOW",
        });

        router.refresh();
      } catch {
        setError("Could not create the task. Please refresh before retrying to check whether it was saved.");
      } finally {
        setPendingPriorityId(null);
      }
    });
  }

  function handleStatusChange(
    priority: WeeklyPriority,
    task: DashboardTask,
    status: TaskStatus,
  ) {
    setError(null);
    setPendingTaskId(task.id);

    startTransition(async () => {
      try {
        await setTaskStatus({
          id: task.id,
          status,
        });

        router.refresh();
      } catch {
        setError("Could not update the task. Please refresh and try again.");
      } finally {
        setPendingTaskId(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader
        eyebrow="This Week"
        title="Priorities"
        action={
          <span className="text-[11px] text-text-tertiary">
            {plan.priorities.length} focused areas
          </span>
        }
      />

      {error && <p role="alert" className="mb-3 text-xs text-danger">{error}</p>}
      {plan.priorities.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs leading-5 text-text-secondary">
            No actionable priorities have been generated for this week yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plan.priorities.map((priority) => {
            const meta = domainMeta[priority.domain];
            const Icon = meta.icon;
            const badge = priorityMeta[priority.priority];
            const task = findTaskForPriority(priority, tasks);
            const isCreating =
              isPending && pendingPriorityId === priority.insightId;
            const isUpdating = isPending && pendingTaskId === task?.id;

            return (
              <article
                key={priority.insightId}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                    <Icon className="h-4 w-4 text-text-secondary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold tracking-wider text-text-tertiary">
                        {String(priority.rank).padStart(2, "0")}
                      </span>

                      <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                        {meta.label}
                      </span>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <h4 className="mt-1 text-sm font-medium text-text-primary">
                      {priority.title}
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {priority.reason}
                    </p>

                    {priority.action && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                        <p className="text-[11px] leading-5 text-text-secondary">
                          {priority.action}
                        </p>
                      </div>
                    )}

                    {!task ? (
                      <div className="mt-3 flex flex-col gap-3 rounded-lg border border-dashed border-white/10 bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                            Task
                          </p>
                          <p className="mt-1 text-[11px] text-text-secondary">
                            No task created for this priority yet.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCreateTask(priority)}
                          disabled={isPending}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-accent-blue/25 bg-accent-blue/10 px-3 py-2 text-xs font-medium text-accent-blue-soft transition hover:border-accent-blue/40 hover:bg-accent-blue/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isCreating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          {isCreating ? "Creating..." : "Create Task"}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                                Task
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${taskStatusMeta[task.status].className}`}
                              >
                                {taskStatusMeta[task.status].label}
                              </span>
                            </div>

                            <p className="mt-1 text-xs font-medium text-text-primary">
                              {task.title}
                            </p>
                          </div>

                          {task.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(
                                  priority,
                                  task,
                                  "IN_PROGRESS",
                                )
                              }
                              disabled={isUpdating}
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-text-primary transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              Start Task
                            </button>
                          )}

                          {task.status === "IN_PROGRESS" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(priority, task, "DONE")
                              }
                              disabled={isUpdating}
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-xs font-medium text-success transition hover:border-success/30 hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Complete
                            </button>
                          )}

                          {task.status === "DONE" && (
                            <span className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-xs font-medium text-success">
                              <Check className="h-3.5 w-3.5" />
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
