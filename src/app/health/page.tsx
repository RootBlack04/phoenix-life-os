import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Scale,
  Moon,
  Droplets,
  Footprints,
  Dumbbell,
  HeartPulse,
} from "lucide-react";
import { HealthChart } from "@/components/charts/health-chart";
import { getHealthPageData } from "@/lib/db";
import Link from "next/link";
import { HealthEntryForm } from "@/components/domain/health-client";
import { addDateDays, dateFromKey, localDateKey } from "@/lib/dates";
import { z } from "zod";

export const dynamic = "force-dynamic";

const icons = {
  Scale,
  Moon,
  Droplets,
  Footprints,
  Dumbbell,
  HeartPulse,
};

export default async function HealthPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const today = localDateKey(new Date());
  const requested = (await searchParams).date;
  const valid = requested === undefined || (z.iso.date().safeParse(requested).success && requested <= today);
  const selectedDate = valid && requested ? requested : today;
  const { history, entry, trend } = await getHealthPageData(selectedDate);
  const latest = entry;
  const formatDay = (day: string) => dateFromKey(day).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });

  const metrics = [
    {
      id: "weight",
      label: "Weight",
      value: latest?.weight ? `${latest.weight} kg` : "—",
      goal: "72 kg",
      percent: latest?.weight
        ? Math.max(
            0,
            Math.min(100, Math.round(((90 - latest.weight) / (90 - 72)) * 100)),
          )
        : 0,
      icon: "Scale",
    },
    {
      id: "sleep",
      label: "Sleep",
      value: latest?.sleep != null ? `${latest.sleep}h` : "—",
      goal: "8h",
      percent: latest?.sleep
        ? Math.min(100, Math.round((latest.sleep / 8) * 100))
        : 0,
      icon: "Moon",
    },
    {
      id: "water",
      label: "Water",
      value: latest?.water != null ? `${latest.water}L` : "—",
      goal: "3L",
      percent: latest?.water
        ? Math.min(100, Math.round((latest.water / 3) * 100))
        : 0,
      icon: "Droplets",
    },
    {
      id: "steps",
      label: "Steps",
      value: latest?.steps?.toLocaleString() ?? "—",
      goal: "10,000",
      percent: latest?.steps
        ? Math.min(100, Math.round((latest.steps / 10000) * 100))
        : 0,
      icon: "Footprints",
    },
    {
      id: "workout",
      label: "Workouts",
      value: latest?.workouts != null ? String(latest.workouts) : "—",
      goal: "5 / week (weekly target)",
      percent: latest?.workouts
        ? Math.min(100, Math.round((latest.workouts / 5) * 100))
        : 0,
      icon: "Dumbbell",
    },
    {
      id: "heart",
      label: "Resting HR",
      value: latest?.heartRate ? `${latest.heartRate} bpm` : "—",
      goal: "60 bpm",
      percent: latest?.heartRate
        ? Math.max(
            0,
            Math.min(100, Math.round(100 - (latest.heartRate - 60) * 5)),
          )
        : 0,
      icon: "HeartPulse",
    },
  ];

  const sleepByDate = new Map(trend.map((row) => [row.date.toISOString().slice(0, 10), row.sleep]));
  const sleepTrend = Array.from({ length: 7 }, (_, index) => {
    const day = addDateDays(selectedDate, index - 6);
    // Null placeholders preserve absent calendar days; they are not observations.
    return { day, hours: sleepByDate.get(day) ?? null };
  });

  return (
    <AppShell title="Health">
      <div className="space-y-6">
        {/* Metrics */}
        <p className="text-sm text-text-secondary">Measurements for {formatDay(selectedDate)} · selected date</p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map((m) => {
            const Icon = icons[m.icon as keyof typeof icons];

            return (
              <Card key={m.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <Icon size={18} className="text-text-secondary" />
                  </div>

                  {m.value !== "—" && <ProgressRing
                    percent={m.percent}
                    size={48}
                    strokeWidth={5}
                    color="var(--accent-blue)"
                    colorTo="var(--accent-purple)"
                  />}
                </div>

                <p className="font-display text-xl font-bold text-text-primary">
                  {m.value}
                </p>

                <p className="text-xs text-text-secondary mt-1">{m.label}</p>

                <p className="text-[10px] text-text-tertiary mt-1">
                  Goal · {m.goal}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Sleep trend + entry form */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader title="Sleep Trend" eyebrow={`7 calendar days ending ${formatDay(selectedDate)}`} />

            <div className="h-[240px] -ml-4">
              <HealthChart data={sleepTrend} />
            </div>
          </Card>

          <Card id="health-editor">
            {!valid && <p role="alert" className="mb-3 text-sm text-danger">Choose a valid date no later than today. Showing today instead.</p>}
            <HealthEntryForm key={`${selectedDate}:${entry?.updatedAt.toISOString() ?? "new"}`} date={selectedDate} today={today} entry={entry ?? null} />
          </Card>
        </div>
        <Card>
          <CardHeader title="Health History" eyebrow="Latest 30 entries · newest first" />
          {history.length === 0 ? <p className="text-sm text-text-secondary">No health history yet.</p> :
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {history.map((row) => {
                const day = row.date.toISOString().slice(0, 10);
                const values = [
                  ["Weight", row.weight == null ? "—" : `${row.weight} kg`],
                  ["Sleep", row.sleep == null ? "—" : `${row.sleep}h`],
                  ["Water", row.water == null ? "—" : `${row.water}L`],
                  ["Steps", row.steps?.toLocaleString() ?? "—"],
                  ["Workouts", row.workouts ?? "—"],
                  ["Resting HR", row.heartRate == null ? "—" : `${row.heartRate} bpm`],
                ];
                return <article key={row.id} aria-label={`Health record ${day}`} className="min-w-0 rounded-xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-medium"><time dateTime={day}>{formatDay(day)}</time></h3>
                    <Link href={`/health?date=${day}#health-editor`} aria-current={day === selectedDate ? "date" : undefined} className="text-xs text-accent-blue-soft hover:underline">{day === selectedDate ? "Selected · Edit" : "View / Edit"}</Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">{values.map(([name, value]) => <div key={name}><dt className="text-text-secondary">{name}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
                </article>;
              })}
            </div>}
        </Card>
      </div>
    </AppShell>
  );
}
