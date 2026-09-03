"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { setProjectProgress } from "@/lib/db/actions";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

const statusTone = {
  "not-started": "neutral",
  "in-progress": "blue",
  done: "success",
  blocked: "danger",
} as const;

const STEP = 10;

// Matches the shape returned by getEngineering() — status is a plain string
// there (Prisma enum lowercased + hyphenated), not the strict `Status`
// union, so we mirror that instead of importing a stricter type.
interface EngineeringBoardProject {
  id: string;
  name: string;
  stack: string[];
  progress: number;
  status: string;
}

export function EngineeringBoard({
  projects,
}: {
  projects: EngineeringBoardProject[];
}) {
  return <div className="space-y-4">{projects.map((project) => <ProjectRow key={project.id} project={project} />)}</div>;
}

function ProjectRow({ project: p }: { project: EngineeringBoardProject }) {
  const router = useRouter();
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function adjust(delta: number) {
    if (saving.current || pending) return;
    const next = Math.max(0, Math.min(100, p.progress + delta));
    if (next === p.progress) return;
    saving.current = true;
    setError(null);
    start(async () => {
      try {
        await setProjectProgress({ id: p.id, progress: next, expectedProgress: p.progress });
        router.refresh();
      } catch {
        setError("Could not save progress. Refreshing saved values; please try again.");
        router.refresh();
      } finally {
        saving.current = false;
      }
    });
  }

  return (
    <div>
        <div className="flex items-center gap-4" aria-busy={pending}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <p className="text-sm font-medium text-text-primary truncate">
                {p.name}
              </p>
              <Badge
                tone={
                  statusTone[p.status as keyof typeof statusTone] ?? "neutral"
                }
              >
                {p.status.replace("-", " ")}
              </Badge>
            </div>
            <ProgressBar percent={p.progress} height={6} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {p.stack.map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-tertiary border border-white/10"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={pending || p.progress <= 0}
              onClick={() => adjust(-STEP)}
              aria-label={`Decrease ${p.name} progress`}
              className="h-7 w-7 rounded-lg glass flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono-num text-xs text-text-secondary w-9 text-center">
              {p.progress}%
            </span>
            <button
              type="button"
              disabled={pending || p.progress >= 100}
              onClick={() => adjust(STEP)}
              aria-label={`Increase ${p.name} progress`}
              className="h-7 w-7 rounded-lg glass flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
