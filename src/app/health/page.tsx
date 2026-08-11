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
import { getHealth } from "@/lib/db";
import { HealthEntryForm } from "@/components/domain/health-client";

export const dynamic = "force-dynamic";

const icons = {
  Scale,
  Moon,
  Droplets,
  Footprints,
  Dumbbell,
  HeartPulse,
};

export default async function HealthPage() {
  const rows = await getHealth();

  const latest = rows.at(-1);

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
      value: latest?.sleep ? `${latest.sleep}h` : "—",
      goal: "8h",
      percent: latest?.sleep
        ? Math.min(100, Math.round((latest.sleep / 8) * 100))
        : 0,
      icon: "Moon",
    },
    {
      id: "water",
      label: "Water",
      value: latest?.water ? `${latest.water}L` : "—",
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
      value: String(latest?.workouts ?? 0),
      goal: "5 / week",
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

  const sleepTrend = rows.slice(-7).map((r) => ({
    day: r.date.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }),
    hours: r.sleep ?? 0,
  }));

  return (
    <AppShell title="Health">
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map((m) => {
            const Icon = icons[m.icon as keyof typeof icons];

            return (
              <Card key={m.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <Icon size={18} className="text-text-secondary" />
                  </div>

                  <ProgressRing
                    percent={m.percent}
                    size={48}
                    strokeWidth={5}
                    color="var(--accent-blue)"
                    colorTo="var(--accent-purple)"
                  />
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
            <CardHeader title="Sleep Trend" eyebrow="Last 7 days" />

            <div className="h-[240px] -ml-4">
              <HealthChart data={sleepTrend} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Log Health" eyebrow="Today's metrics" />

            <HealthEntryForm />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
