"use client";

import {
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Flag,
  Loader2,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { setTaskStatus } from "@/lib/db/actions";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
};

const groups: Array<{
  status: TaskStatus;
  title: string;
  eyebrow: string;
  icon: typeof Circle;
}> = [
  { status: "PENDING", title: "Pending", eyebrow: "Ready", icon: Circle },
  {
    status: "IN_PROGRESS",
    title: "In Progress",
    eyebrow: "Active",
    icon: Clock3,
  },
  { status: "DONE", title: "Done", eyebrow: "Completed", icon: CheckCircle2 },
];

const statusMeta: Record<
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
      "border-accent-blue/25 bg-accent-blue/10 text-accent-blue-soft",
  },
  DONE: {
    label: "DONE",
    className: "border-success/25 bg-success/10 text-success",
  },
};

const priorityMeta: Record<TaskPriority, string> = {
  LOW: "text-text-tertiary",
  MEDIUM: "text-text-secondary",
  HIGH: "text-warning",
  CRITICAL: "text-danger",
};

const dueDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDueDate(value: string) {
  return dueDateFormatter.format(new Date(value));
}

export function TasksClient({ tasks }: { tasks: TaskItem[] }) {
  const router = useRouter();
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus(task: TaskItem, status: TaskStatus) {
    setPendingTaskId(task.id);
    setError(null);

    startTransition(async () => {
      try {
        await setTaskStatus({ id: task.id, status });
        router.refresh();
      } catch {
        setError(`Could not update “${task.title}”. Please try again.`);
      } finally {
        setPendingTaskId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent-blue-soft">
            Execution
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
            Move focused work forward
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Start pending tasks and complete active work. Every change is saved
            to your task record.
          </p>
        </div>

        <p className="text-xs text-text-tertiary">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs text-danger"
        >
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm font-medium text-text-primary">
              No tasks yet
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Tasks you create from Weekly Priorities will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {groups.map((group) => {
            const groupTasks = tasks.filter(
              (task) => task.status === group.status,
            );
            const GroupIcon = group.icon;

            return (
              <Card key={group.status} className="h-fit">
                <CardHeader
                  eyebrow={group.eyebrow}
                  title={group.title}
                  action={
                    <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-text-secondary">
                      {groupTasks.length}
                    </span>
                  }
                />

                {groupTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-7 text-center">
                    <GroupIcon className="mx-auto h-5 w-5 text-text-tertiary" />
                    <p className="mt-2 text-xs text-text-tertiary">
                      No {group.title.toLowerCase()} tasks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groupTasks.map((task) => {
                      const isUpdating =
                        isPending && pendingTaskId === task.id;

                      return (
                        <article
                          key={task.id}
                          className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${statusMeta[task.status].className}`}
                            >
                              {statusMeta[task.status].label}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium ${priorityMeta[task.priority]}`}
                            >
                              <Flag className="h-3 w-3" />
                              {task.priority}
                            </span>
                          </div>

                          <h3 className="mt-3 text-sm font-medium leading-5 text-text-primary">
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="mt-1 text-xs leading-5 text-text-secondary">
                              {task.description}
                            </p>
                          )}

                          {task.dueDate && (
                            <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-text-tertiary">
                              <Clock3 className="h-3 w-3" />
                              Due {formatDueDate(task.dueDate)}
                            </p>
                          )}

                          <div className="mt-4 border-t border-white/10 pt-3">
                            {task.status === "PENDING" && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  updateStatus(task, "IN_PROGRESS")
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-accent-blue/25 bg-accent-blue/10 px-3 py-2 text-xs font-medium text-accent-blue-soft transition hover:border-accent-blue/40 hover:bg-accent-blue/15 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                                {isUpdating ? "Starting..." : "Start Task"}
                              </button>
                            )}

                            {task.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => updateStatus(task, "DONE")}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-xs font-medium text-success transition hover:border-success/40 hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                {isUpdating ? "Completing..." : "Complete"}
                              </button>
                            )}

                            {task.status === "DONE" && (
                              <div className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-xs font-medium text-success">
                                <Check className="h-3.5 w-3.5" />
                                Completed
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
