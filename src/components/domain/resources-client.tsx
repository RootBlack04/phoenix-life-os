"use client";

import { useRef, useTransition } from "react";
import {
  addResource,
  removeResource,
  setResourceCompleted,
  setResourceProgress,
} from "@/lib/db/actions";

type ResourceData = {
  id: string;
  title: string;
  type: string;
  progress: number | null;
  tag: string;
  url: string | null;
  completed: boolean;
};

const types = [
  { value: "COURSE", label: "Course" },
  { value: "BOOK", label: "Book" },
  { value: "VIDEO", label: "Video" },
  { value: "LINK", label: "Link" },
  { value: "CERTIFICATE", label: "Certificate" },
] as const;

export function ResourcesClient({ resources }: { resources: ResourceData[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      {/* Add Resource */}
      <form
        ref={form}
        className="glass rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        action={(formData) => {
          const progressValue = formData.get("progress");

          start(async () => {
            await addResource({
              title: String(formData.get("title") ?? ""),
              type: String(formData.get("type")) as
                | "BOOK"
                | "COURSE"
                | "VIDEO"
                | "LINK"
                | "CERTIFICATE",
              tag: String(formData.get("tag") ?? ""),
              progress:
                progressValue !== null && progressValue !== ""
                  ? Number(progressValue)
                  : undefined,
              url: String(formData.get("url") ?? ""),
            });

            form.current?.reset();
          });
        }}
      >
        <div className="md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">
            Add resource
          </p>

          <p className="text-lg font-display font-semibold text-text-primary mt-1">
            New learning resource
          </p>
        </div>

        <input name="title" required placeholder="Title" className="field" />

        <input
          name="tag"
          required
          placeholder="Tag e.g. Engineering"
          className="field"
        />

        <select name="type" defaultValue="COURSE" className="field">
          {types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <input
          name="progress"
          type="number"
          min="0"
          max="100"
          placeholder="Progress %"
          className="field"
        />

        <input
          name="url"
          type="url"
          placeholder="URL (optional)"
          className="field md:col-span-2"
        />

        <button
          disabled={pending}
          className="md:col-span-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2 text-sm font-medium text-white"
        >
          {pending ? "Saving…" : "Add resource"}
        </button>
      </form>

      {/* Resource controls */}
      <div className="space-y-3">
        {resources.map((resource) => {
          const progress = resource.progress ?? 0;

          return (
            <div key={resource.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {resource.title}
                  </p>

                  <p className="text-[11px] text-text-tertiary mt-1">
                    {resource.tag} · {resource.type.toLowerCase()}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await setResourceCompleted({
                          id: resource.id,
                          completed: !resource.completed,
                        });
                      })
                    }
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-text-secondary hover:bg-white/[0.05]"
                  >
                    {resource.completed ? "Completed" : "Complete"}
                  </button>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await removeResource(resource.id);
                      })
                    }
                    className="rounded-lg border border-red-400/20 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-400/10"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {resource.progress !== null && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-text-tertiary">
                      Progress
                    </span>

                    <span className="text-[11px] text-text-secondary">
                      {progress}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    disabled={pending}
                    onChange={(event) => {
                      const value = Number(event.target.value);

                      start(async () => {
                        await setResourceProgress({
                          id: resource.id,
                          progress: value,
                        });
                      });
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
              )}

              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-[11px] text-accent-blue-soft hover:underline"
                >
                  Open resource →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
