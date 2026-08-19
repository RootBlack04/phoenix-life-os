 "use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  Clock3,
  Flag,
  Plus,
  Target,
  X,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Priority = "high" | "medium";
type TaskStatus = "pending" | "in_progress" | "done";

type DemoPriority = {
  id: string;
  rank: number;
  domain: string;
  priority: Priority;
  title: string;
  reason: string;
  action: string;
};

type DemoTask = {
  id: string;
  priorityId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  status: TaskStatus;
};

const priorities: DemoPriority[] = [
  {
    id: "habits",
    rank: 1,
    domain: "Habits",
    priority: "high",
    title: "Habit consistency dropped",
    reason: "Habit completion fell from 73% to 31%.",
    action: "Prioritize your existing habits before adding new ones.",
  },
  {
    id: "languages",
    rank: 2,
    domain: "Languages",
    priority: "high",
    title: "Language study is behind target",
    reason: "You logged 3.3h out of a 10h weekly goal.",
    action: "Schedule another focused language session this week.",
  },
  {
    id: "mindset",
    rank: 3,
    domain: "Mindset",
    priority: "medium",
    title: "Mindset needs attention",
    reason: "Current Mindset score is 54/100.",
    action: "Give Mindset a focused session this week.",
  },
  {
    id: "engineering",
    rank: 4,
    domain: "Engineering",
    priority: "medium",
    title: "Engineering has room to grow",
    reason: "Current Engineering score is 42/100.",
    action: "Choose one active project and move it forward.",
  },
];

const initialTasks: DemoTask[] = [
  {
    id: "demo-task-engineering",
    priorityId: "engineering",
    title: "Finish Phoenix dashboard polish",
    description: "Complete the current UI polish pass.",
    priority: "medium",
    dueDate: "2026-08-21",
    status: "in_progress",
  },
  {
    id: "demo-task-languages",
    priorityId: "languages",
    title: "Study Spanish for 45 minutes",
    description: "Complete one focused Spanish study session.",
    priority: "high",
    dueDate: "2026-08-21",
    status: "pending",
  },
  {
    id: "demo-task-mindset",
    priorityId: "mindset",
    title: "Complete a 15-minute reflection",
    description: "Write a short weekly reflection and identify one improvement.",
    priority: "medium",
    dueDate: "2026-08-20",
    status: "done",
  },
];

const statusMeta: Record<TaskStatus, { label: string; className: string }> = {
  pending: {
    label: "PENDING",
    className: "bg-white/5 text-text-secondary border-white/10",
  },
  in_progress: {
    label: "IN PROGRESS",
    className: "bg-accent-blue/10 text-accent-blue-soft border-accent-blue/25",
  },
  done: {
    label: "DONE",
    className: "bg-success/10 text-success border-success/25",
  },
};

export function ExecutionDemo() {
  const [tasks, setTasks] = useState<DemoTask[]>(initialTasks);
  const [selectedPriority, setSelectedPriority] =
    useState<DemoPriority | null>(null);

  const taskByPriority = useMemo(
    () => new Map(tasks.map((task) => [task.priorityId, task])),
    [tasks],
  );

  const completedTasks = tasks.filter((task) => task.status === "done").length;

  function createDemoTask(
    priority: DemoPriority,
    values: Omit<DemoTask, "id" | "priorityId" | "status">,
  ) {
    setTasks((current) => [
      ...current,
      {
        ...values,
        id: `demo-task-${Date.now()}`,
        priorityId: priority.id,
        priority: priority.priority,
        status: "pending",
      },
    ]);
    setSelectedPriority(null);
  }

  function advanceTask(taskId: string) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;

        const nextStatus: TaskStatus =
          task.status === "pending"
            ? "in_progress"
            : task.status === "in_progress"
              ? "done"
              : "done";

        return { ...task, status: nextStatus };
      }),
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="rounded-xl border border-accent-blue/15 bg-accent-blue/[0.04] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent-blue-soft" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-blue-soft">
                  Execution Loop
                </p>
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold text-text-primary">
                Turn priorities into action
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                Turn a Weekly Priority into a Task only when you choose to.
                This prototype uses fake data only — no database changes.
              </p>
            </div>

            <Badge tone="neutral">PROTOTYPE</Badge>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-5">
            {[
              ["1", "Priority"],
              ["2", "Action"],
              ["3", "Task"],
              ["4", "Execute"],
              ["5", "Review"],
            ].map(([number, label], index, array) => (
              <div key={number} className="relative">
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  <span className="text-[10px] text-text-tertiary">
                    {number}
                  </span>
                  <p className="mt-1 text-xs font-medium text-text-primary">
                    {label}
                  </p>
                </div>
                {index < array.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-text-tertiary md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          eyebrow="Step 01"
          title="Weekly Priorities"
          action={
            <span className="text-[11px] text-text-tertiary">
              {priorities.length} focus areas
            </span>
          }
        />

        <div className="space-y-3">
          {priorities.map((priority) => {
            const existingTask = taskByPriority.get(priority.id);
            const priorityTone =
              priority.priority === "high" ? "danger" : "warning";

            return (
              <article
                key={priority.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/15"
              >
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs font-semibold text-text-secondary">
                    {String(priority.rank).padStart(2, "0")}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                        {priority.domain}
                      </span>
                      <Badge tone={priorityTone}>{priority.priority}</Badge>
                    </div>

                    <h3 className="mt-1 text-sm font-medium text-text-primary">
                      {priority.title}
                    </h3>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                          Why
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-text-secondary">
                          {priority.reason}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                          Action
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-text-secondary">
                          {priority.action}
                        </p>
                      </div>
                    </div>

                    {existingTask ? (
                      <TaskCard
                        task={existingTask}
                        onAdvance={() => advanceTask(existingTask.id)}
                      />
                    ) : (
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-white/10 bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                            Task
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            No task created for this priority yet.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedPriority(priority)}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-accent-blue/25 bg-accent-blue/10 px-3 py-2 text-xs font-medium text-accent-blue-soft transition hover:border-accent-blue/40 hover:bg-accent-blue/15"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          eyebrow="Step 05"
          title="Weekly Review"
          action={
            <span className="text-[11px] text-text-tertiary">
              {completedTasks} of {tasks.length} tasks completed
            </span>
          }
        />

        <div className="grid gap-3 md:grid-cols-3">
          <ReviewMetric
            label="Created"
            value={String(tasks.length)}
            detail="Tasks created from priorities"
          />
          <ReviewMetric
            label="Completed"
            value={String(completedTasks)}
            detail="Tasks finished this cycle"
          />
          <ReviewMetric
            label="Next"
            value="Review"
            detail="Use outcomes in the next weekly plan"
          />
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-medium text-text-primary">
            Review loop
          </p>
          <p className="mt-1 text-[11px] leading-5 text-text-secondary">
            Completed tasks become evidence for the next weekly review. The
            production version will connect this step to real metrics.
          </p>
        </div>
      </Card>

      {selectedPriority && (
        <CreateTaskModal
          priority={selectedPriority}
          onClose={() => setSelectedPriority(null)}
          onCreate={createDemoTask}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  onAdvance,
}: {
  task: DemoTask;
  onAdvance: () => void;
}) {
  const isDone = task.status === "done";

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 shrink-0">
            {isDone ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-3.5 w-3.5" />
              </div>
            ) : task.status === "in_progress" ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-blue/10 text-accent-blue-soft">
                <Circle className="h-3.5 w-3.5 fill-current" />
              </div>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-text-tertiary">
                <Circle className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                Task
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${statusMeta[task.status].className}`}
              >
                {statusMeta[task.status].label}
              </span>
            </div>

            <p className="mt-1 text-sm font-medium text-text-primary">
              {task.title}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {task.description}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-text-tertiary">
              <span className="inline-flex items-center gap-1">
                <Flag className="h-3 w-3" />
                {task.priority.toUpperCase()}
              </span>
              <span>•</span>
              <span>Due: {task.dueDate}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdvance}
          disabled={isDone}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-text-primary transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-default disabled:opacity-50"
        >
          {task.status === "pending" && (
            <>
              <Clock3 className="h-3.5 w-3.5" />
              Start Task
            </>
          )}
          {task.status === "in_progress" && (
            <>
              <Check className="h-3.5 w-3.5" />
              Complete
            </>
          )}
          {isDone && (
            <>
              <Check className="h-3.5 w-3.5" />
              Completed
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ReviewMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-semibold text-text-primary">
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-text-tertiary">{detail}</p>
    </div>
  );
}

function CreateTaskModal({
  priority,
  onClose,
  onCreate,
}: {
  priority: DemoPriority;
  onClose: () => void;
  onCreate: (
    priority: DemoPriority,
    values: Omit<DemoTask, "id" | "priorityId" | "status">,
  ) => void;
}) {
  const [title, setTitle] = useState(priority.action);
  const [description, setDescription] = useState(priority.action);
  const [dueDate, setDueDate] = useState("2026-08-21");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0e1c] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              Create Task
            </p>
            <h3 className="mt-1 font-display text-base font-semibold text-text-primary">
              From: {priority.domain}
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              User-confirmed execution
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-tertiary transition hover:bg-white/5 hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Title
            </span>
            <input
              className="field mt-1"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Description
            </span>
            <textarea
              className="field mt-1 min-h-24 resize-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                Priority
              </span>
              <div className="mt-1 flex h-10 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-text-secondary">
                {priority.priority.toUpperCase()}
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                Due date
              </span>
              <input
                type="date"
                className="field mt-1"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!title.trim()}
            onClick={() =>
              onCreate(priority, {
                title: title.trim(),
                description: description.trim(),
                priority: priority.priority,
                dueDate,
              })
            }
            className="inline-flex items-center gap-2 rounded-lg border border-accent-blue/25 bg-accent-blue/10 px-3 py-2 text-xs font-medium text-accent-blue-soft transition hover:bg-accent-blue/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
