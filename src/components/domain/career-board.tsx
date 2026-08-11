"use client";
import { useTransition } from "react";
import { format } from "date-fns";
import { setJobStage } from "@/lib/db/actions";
// import { Card } from "@/components/ui/card";
import type { JobApplication } from "@/types";
const columns = [
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
] as const;
export function CareerBoard({
  applications,
}: {
  applications: JobApplication[];
}) {
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map((col) => {
        const items = applications.filter((j) => j.stage === col.key);
        return (
          <div key={col.key} className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {col.label}
              </p>
              <span className="text-[11px] text-text-tertiary">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((j) => (
                <button
                  disabled={pending}
                  key={j.id}
                  onClick={() => {
                    const next =
                      columns[
                        (columns.findIndex((c) => c.key === col.key) + 1) %
                          columns.length
                      ].key;
                    start(() =>
                      setJobStage({
                        id: j.id,
                        stage: next.toUpperCase() as
                          | "APPLIED"
                          | "INTERVIEW"
                          | "OFFER"
                          | "REJECTED",
                      }),
                    );
                  }}
                  className="w-full text-left rounded-lg bg-white/[0.04] border border-white/10 p-2.5 hover:bg-white/[0.07] transition"
                >
                  <p className="text-sm text-text-primary font-medium">
                    {j.company}
                  </p>
                  <p className="text-[11px] text-text-tertiary">{j.role}</p>
                  <p className="text-[10px] text-text-tertiary mt-1">
                    {format(new Date(j.appliedOn), "MMM d")}
                  </p>
                </button>
              ))}
              {items.length === 0 && (
                <p className="text-[11px] text-text-tertiary italic">
                  No applications
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
