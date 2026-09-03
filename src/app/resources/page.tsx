import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BookOpen, GraduationCap, Video, Link2, Award } from "lucide-react";
import { getResources } from "@/lib/db";
import { ResourcesClient } from "@/components/domain/resources-client";

export const dynamic = "force-dynamic";

const typeIcon = {
  book: BookOpen,
  course: GraduationCap,
  video: Video,
  link: Link2,
  certificate: Award,
};

export default async function ResourcesPage() {
  const resources = await getResources();

  return (
    <AppShell title="Resources">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {resources.map((r) => {
            const Icon =
              typeIcon[r.type.toLowerCase() as keyof typeof typeIcon] ?? Link2;

            return (
              <Card key={r.id} className="min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-accent-blue-soft" />
                  </div>

                  <Badge tone={r.completed ? "success" : "neutral"}>
                    {r.completed ? "Completed" : r.tag}
                  </Badge>
                </div>

                <p className="text-sm font-medium text-text-primary mb-2 break-words">
                  {r.title}
                </p>

                {typeof r.progress === "number" ? (
                  <>
                    <ProgressBar percent={r.progress} height={6} />

                    <p className="text-[11px] text-text-tertiary mt-1.5">
                      {r.progress}% complete
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-text-tertiary capitalize">
                    {r.type.toLowerCase()}
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        <ResourcesClient
          resources={resources.map((resource) => ({
            id: resource.id,
            title: resource.title,
            type: resource.type,
            progress: resource.progress,
            tag: resource.tag,
            url: resource.url,
            completed: resource.completed,
          }))}
        />
      </div>
    </AppShell>
  );
}
