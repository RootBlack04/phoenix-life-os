"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Goal } from "@/generated/prisma/client";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { APP_TIMEZONE } from "@/lib/dates";
import { reopenCompletedGoal } from "@/lib/db/actions";
import { GoalManager } from "@/components/goals/goal-manager";
import type { Mission } from "@/types";

type GoalItem = Pick<Goal, "id" | "title" | "description" | "category" | "priority" | "progress" | "status"> & { deadline: string | null };
const dateFormat = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, month: "short", day: "numeric", year: "numeric" });
const labels = { NOT_STARTED: "Not started", IN_PROGRESS: "In progress", DONE: "Completed", BLOCKED: "Blocked" };

export function GoalsClient({ goals, view }: { goals: GoalItem[]; view: "active" | "completed" }) {
  const router = useRouter();
  const saving = useRef(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  function reopen(goal: GoalItem) {
    if (saving.current || pending || goal.status !== "DONE") return;
    saving.current = true;
    setError(null);
    setMessage("Reopening goal…");
    start(async () => {
      try {
        await reopenCompletedGoal(goal.id);
        setMessage(`Reopened “${goal.title}”. Find it in Active. Progress is unchanged.`);
      } catch {
        setMessage("");
        setError("Could not reopen the goal. It may have changed elsewhere. Refresh and check its status before retrying.");
      } finally {
        router.refresh();
        saving.current = false;
      }
    });
  }
  if (view === "active") return <GoalManager missions={goals.map((goal) => ({
    ...goal,
    category: goal.category.toLowerCase() as Mission["category"],
    priority: goal.priority.toLowerCase() as Mission["priority"],
    status: goal.status.toLowerCase().replaceAll("_", "-") as Mission["status"],
  }))} />;
  return <div className="space-y-3">
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <p role="status" aria-live="polite" className="text-xs text-text-secondary [overflow-wrap:anywhere]">{message}</p>
    {!goals.length && <Card><p className="text-sm text-text-secondary">No completed goals yet.</p></Card>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{goals.map((goal) => <article key={goal.id} className="glass min-w-0 rounded-xl p-4 [overflow-wrap:anywhere]">
      <h2 className="text-base font-medium text-text-primary">{goal.title}</h2>
      {goal.description && <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{goal.description}</p>}
      <p className="mt-2 text-xs text-text-secondary">{goal.category.toLowerCase()} · {goal.priority.toLowerCase()} priority · {labels[goal.status]}</p>
      <p className="mt-3 text-xs text-text-secondary">Last progress: {goal.progress}%</p>
      <ProgressBar percent={goal.progress} />
      <p className="mt-2 text-xs text-text-tertiary">{goal.deadline ? `Deadline: ${dateFormat.format(new Date(goal.deadline))}` : "No deadline"}</p>
      {goal.status === "DONE" && <button onClick={() => reopen(goal)} disabled={pending}
        className="mt-3 min-h-11 rounded-lg border border-accent-blue/25 bg-accent-blue/10 px-4 text-sm text-accent-blue-soft disabled:cursor-wait disabled:opacity-50">Reopen</button>}
    </article>)}</div>
  </div>;
}
