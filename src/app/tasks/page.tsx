import { TasksClient } from "@/components/tasks/tasks-client";
import { AppShell } from "@/components/layout/app-shell";
import { getTasks } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <AppShell title="Tasks">
      <TasksClient
        tasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate?.toISOString() ?? null,
        }))}
      />
    </AppShell>
  );
}
