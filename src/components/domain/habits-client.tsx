"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { localDateKey } from "@/lib/dates";
import { Check } from "lucide-react";

import { setHabit } from "@/lib/db/actions";

import { Card, CardHeader } from "@/components/ui/card";

import { cn } from "@/lib/utils";

import type { HabitRow } from "@/types";

const days = ["M", "T", "W", "T", "F", "S", "S"];

function getDateKey(mondayDate: string, index: number) {
  const date = new Date(`${mondayDate}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + index);

  return date.toISOString().slice(0, 10);
}

export function HabitsClient({
  habits,
  mondayDate,
}: {
  habits: HabitRow[];
  mondayDate: string;
}) {
  return (
    <Card>
      <CardHeader
        title="Habits Tracker"
        eyebrow="This week"
        action={
          <span className="text-xs text-accent-blue-soft">Weekly view</span>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr>
              <th className="pb-3 pr-4 text-left text-[11px] font-medium text-text-tertiary">
                Habit
              </th>

              {days.map((day, index) => (
                <th
                  key={`${day}-${index}`}
                  className="w-10 pb-3 text-center text-[11px] font-medium text-text-tertiary"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {habits.map((habit) => {
              const completedCount = habit.days.filter(Boolean).length;

              return (
                <tr key={habit.id} className="border-t border-white/5">
                  <td className="py-3 pr-4 text-sm text-text-secondary">
                    <span className="mr-2">{habit.emoji}</span>

                    <span>{habit.label}</span>

                    <span className="ml-2 text-[10px] text-text-tertiary">
                      ({completedCount}/7)
                    </span>
                  </td>

                  {habit.days.map((completed, index) => {
                    const date = getDateKey(mondayDate, index);

                    return (
                      <td key={date} className="py-3 text-center">
                        <HabitCell habitId={habit.id} label={habit.label} date={date} completed={completed} />
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

export function HabitCell({ habitId, label, date, completed }: { habitId: string; label: string; date: string; completed: boolean }) {
  const router = useRouter();
  const saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const future = date > localDateKey(new Date());
  function toggle() {
    if (saving.current || pending || date > localDateKey(new Date())) return;
    saving.current = true;
    setError(null);
    startTransition(async () => {
      try {
        await setHabit({ habitId, date, completed: !completed });
        router.refresh();
      } catch {
        setError("Could not save the habit. Please try again.");
        router.refresh();
      } finally {
        saving.current = false;
      }
    });
  }
  return <>
    <button type="button" disabled={pending || future} aria-label={`${label} ${date}`} aria-pressed={completed}
      title={future ? "Future check-ins are unavailable" : date} onClick={toggle}
      className={cn("mx-auto inline-flex h-5 w-5 items-center justify-center rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-accent-blue/40 disabled:cursor-not-allowed disabled:opacity-40",
        completed ? "bg-success/90" : "bg-white/5 hover:bg-white/10")}>
      {completed && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
    </button>
    {error && <p role="alert" className="mt-1 text-[10px] text-danger max-w-28">{error}</p>}
  </>;
}
