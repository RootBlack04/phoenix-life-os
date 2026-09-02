import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { GoalsClient } from "@/components/goals/goals-client";
import { getGoalHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const view = (await searchParams).view === "completed" ? "completed" : "active";
  const goals = await getGoalHistory(view);
  return <AppShell title="Goals">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Goal views" className="flex gap-2">
        {(["active", "completed"] as const).map((item) => <Link key={item}
          href={item === "active" ? "/goals" : "/goals?view=completed"}
          aria-current={view === item ? "page" : undefined}
          className={`min-h-11 rounded-lg border px-4 py-3 text-sm ${view === item ? "border-accent-blue/25 bg-accent-blue/10 text-accent-blue-soft" : "border-white/10 text-text-secondary"}`}>
          {item === "active" ? "Active" : "Completed"}
        </Link>)}
      </nav>
      <Link href="/#missions" className="text-sm text-accent-blue-soft hover:underline">Create or edit goals on Overview</Link>
    </div>
    <p className="text-sm text-text-secondary">{view === "completed"
      ? "Retained completed goals, not a version history. Exact completion dates are not recorded. Reopening keeps progress unchanged; you can edit it on Overview."
      : "All non-completed goals, including not-started and blocked goals. Overview shows in-progress goals."}</p>
    <GoalsClient key={view} view={view} goals={goals.map((goal) => ({
      id: goal.id, title: goal.title, description: goal.description, category: goal.category,
      priority: goal.priority, progress: goal.progress, status: goal.status,
      deadline: goal.deadline?.toISOString() ?? null,
    }))} />
  </AppShell>;
}
