"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { setHabit } from "@/lib/db/actions";

import type { HabitRow } from "@/types";

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

function getMondayDateKey() {
  const now = new Date();

  const day = now.getDay();

  // JS:
  // Sunday = 0
  // Monday = 1
  // ...
  //
  // Convert to:
  // Monday = 0
  // Tuesday = 1
  // ...
  const mondayOffset = (day + 6) % 7;

  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - mondayOffset,
  );

  monday.setHours(12, 0, 0, 0);

  return monday;
}

function getDateKey(index: number) {
  const monday = getMondayDateKey();

  monday.setDate(monday.getDate() + index);

  const year = monday.getFullYear();

  const month = String(monday.getMonth() + 1).padStart(2, "0");

  const day = String(monday.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function HabitsTracker({ habits }: { habits: HabitRow[] }) {
  const [pending, start] = useTransition();

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
                    const date = getDateKey(index);

                    return (
                      <td key={index} className="text-center py-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            start(() =>
                              setHabit({
                                habitId: habit.id,

                                date,

                                completed: !completed,
                              }),
                            )
                          }
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
