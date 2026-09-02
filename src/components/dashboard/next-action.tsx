"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Play } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { setTaskStatus } from "@/lib/db/actions";
import type { NextActionData } from "@/lib/tasks/next-action";

export function NextAction({ task }: { task: NextActionData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  function advance() {
    if (!task || pending || saving.current) return;
    saving.current = true;
    setMessage(null);
    const status = task.status === "PENDING" ? "IN_PROGRESS" : "DONE";
    startTransition(async () => {
      try {
        const saved = await setTaskStatus({ id: task.id, status, expectedStatus: task.status });
        setMessage(saved.status === status ? "Task saved. Next action refreshed." : "This task changed elsewhere. Showing the latest task state.");
      } catch {
        setMessage("Could not confirm the update. Refreshing task data; please check before retrying.");
      } finally {
        router.refresh();
        saving.current = false;
      }
    });
  }

  return (
    <Card role="region" aria-label="Next Action">
      <CardHeader title="Next Action" eyebrow="What should I do now?" action={
        <Link href="/tasks" className="shrink-0 text-xs text-accent-blue-soft hover:underline">View tasks</Link>
      } />
      {task ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-medium text-text-primary [overflow-wrap:anywhere]">{task.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{task.status === "IN_PROGRESS" ? "In progress" : "Pending"}</span>
              <span>Priority: {task.priority}</span>
              {task.due.label && <span className={task.due.overdue ? "text-warning" : "text-text-tertiary"}>{task.due.label}</span>}
            </div>
          </div>
          <button type="button" onClick={advance} disabled={pending}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-accent-blue/25 bg-accent-blue/10 px-4 py-2 text-sm font-medium text-accent-blue-soft hover:bg-accent-blue/15 disabled:cursor-wait disabled:opacity-50">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : task.status === "PENDING" ? <Play className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {pending ? "Saving…" : task.status === "PENDING" ? "Start" : "Complete"}
          </button>
        </div>
      ) : <p className="text-sm text-text-secondary">No active task right now.</p>}
      <p role="status" aria-live="polite" className="mt-2 text-xs text-text-secondary">{message}</p>
    </Card>
  );
}
