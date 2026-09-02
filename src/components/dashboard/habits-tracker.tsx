"use client";

import { useState, useTransition } from "react";
import { addDateDays } from "@/lib/dates";
import { Check } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { setHabit } from "@/lib/db/actions";

import type { HabitRow } from "@/types";

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

export function HabitsTracker({ habits, mondayDate }: { habits: HabitRow[]; mondayDate: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader
        title="Habits Tracker"
        eyebrow="This week"
        action={
          <a
            href="/habits"
            className="text-xs text-accent-blue-soft hover:underline"
          >
            Full tracker
          </a>
        }
      />

      {error && <p role="alert" className="mb-3 text-xs text-danger">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[420px]">
          <thead>
            <tr>
              <th className="text-[11px] font-medium text-text-tertiary pb-2 pr-2">
                Habit
              </th>

              {dayLabels.map((day, index) => (
                <th
                  key={index}
                  className="text-[11px] font-medium text-text-tertiary pb-2 text-center w-8"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {habits.map((habit) => {
              const doneCount = habit.days.filter(Boolean).length;

              return (
                <tr key={habit.id} className="border-t border-white/5">
                  <td className="py-2 pr-2 text-sm text-text-secondary whitespace-nowrap">
                    <span className="mr-1.5">{habit.emoji}</span>

                    {habit.label}

                    <span className="ml-1.5 text-[10px] text-text-tertiary">
                      ({doneCount}/7)
                    </span>
                  </td>

                  {habit.days.map((completed, index) => {
                    const date = addDateDays(mondayDate, index);

                    return (
                      <td key={index} className="text-center py-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => start(async () => {
                            setError(null);
                            try { await setHabit({ habitId: habit.id, date, completed: !completed }); }
                            catch { setError("Could not save the habit. Please try again."); }
                          })}
                          aria-pressed={completed}
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-md mx-auto transition",
                            completed
                              ? "bg-gradient-to-br from-success/70 to-success"
                              : "bg-white/5 hover:bg-white/10",
                            pending && "opacity-50 cursor-wait",
                          )}
                          aria-label={`${habit.label} ${date}`}
                        >
                          {completed && (
                            <Check
                              className="h-3 w-3 text-black/70"
                              strokeWidth={3}
                            />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
