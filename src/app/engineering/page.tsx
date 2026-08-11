import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LayoutTemplate, Server, Database, Boxes, Binary } from "lucide-react";
import { getEngineering } from "@/lib/db";
import { EngineeringBoard } from "@/components/domain/engineering-board";
export const dynamic = "force-dynamic";
const icons = { LayoutTemplate, Server, Database, Boxes, Binary };
export default async function EngineeringPage() {
  const { tracks, projects } = await getEngineering();
  return (
    <AppShell title="Engineering">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tracks.map((t) => {
          const Icon = icons[t.icon as keyof typeof icons] ?? Boxes;
          return (
            <Card key={t.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-purple/25 to-accent-blue/15 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-accent-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {t.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    {t.tasksDone}/{t.tasksTotal} tasks · {t.status}
                  </p>
                </div>
                <span className="font-display text-lg font-bold text-text-primary shrink-0">
                  {t.percent}%
                </span>
              </div>
              <ProgressBar
                percent={t.percent}
                gradientFrom="var(--accent-purple)"
                gradientTo="var(--accent-pink)"
              />
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader
          title="Projects"
          eyebrow={`${projects.length} active builds`}
        />
        <EngineeringBoard projects={projects} />
      </Card>
    </AppShell>
  );
}
