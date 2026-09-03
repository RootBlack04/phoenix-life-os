"use client";

import { addDateDays } from "@/lib/dates";
import { HabitCell } from "@/components/domain/habits-client";

import { Card, CardHeader } from "@/components/ui/card";

import type { HabitRow } from "@/types";

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

export function HabitsTracker({ habits, mondayDate }: { habits: HabitRow[]; mondayDate: string }) {

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
                    const date = addDateDays(mondayDate, index);

                    return (
                      <td key={index} className="text-center py-2">
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
