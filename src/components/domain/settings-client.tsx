"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Bell, Target, Layout, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveSettings } from "@/lib/db/actions";

type Theme = "AURORA" | "SUNSET" | "FOREST";

type Language = "ENGLISH" | "SPANISH" | "FRENCH" | "ARABIC";

type SettingsState = {
  theme: Theme;
  sidebarCollapsed: boolean;

  dailyMissionReminders: boolean;
  weeklyReviewEmail: boolean;
  habitStreakAlerts: boolean;
  jobApplicationFollowUps: boolean;

  weeklyFocusHours: number;
  weeklyScoreGoal: number;

  language: Language;
};

type Props = {
  initialUser: {
    name: string;
    timezone: string;
  };

  initialSettings: SettingsState;
};

const themes = [
  {
    id: "AURORA" as const,
    label: "Aurora (default)",
    swatch: "linear-gradient(120deg,#4f7cff,#9b6bff)",
  },
  {
    id: "SUNSET" as const,
    label: "Sunset",
    swatch: "linear-gradient(120deg,#fbbf24,#ec5cb0)",
  },
  {
    id: "FOREST" as const,
    label: "Forest",
    swatch: "linear-gradient(120deg,#34d399,#22d3ee)",
  },
];

const languages = [
  {
    id: "ENGLISH" as const,
    label: "English",
  },
  {
    id: "SPANISH" as const,
    label: "Español",
  },
  {
    id: "FRENCH" as const,
    label: "Français",
  },
  {
    id: "ARABIC" as const,
    label: "العربية",
  },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors shrink-0",
        checked
          ? "bg-gradient-to-r from-accent-blue to-accent-purple"
          : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SettingsClient({ initialUser, initialSettings }: Props) {
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initialUser.name);
  const [timezone, setTimezone] = useState(initialUser.timezone);

  const [settings, setSettings] = useState(initialSettings);

  const [saved, setSaved] = useState(false);

  const updateBoolean = (
    key:
      | "sidebarCollapsed"
      | "dailyMissionReminders"
      | "weeklyReviewEmail"
      | "habitStreakAlerts"
      | "jobApplicationFollowUps",
    value: boolean,
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  };

  const handleSave = () => {
    setSaved(false);

    startTransition(async () => {
      await saveSettings({
        name,
        timezone,
        ...settings,
      });

      setSaved(true);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <Card>
          <CardHeader title="Profile" eyebrow="Your identity" />

          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center text-xl font-semibold text-white shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="font-display text-base font-semibold text-text-primary">
                {name}
              </p>

              <p className="text-xs text-text-tertiary">{timezone}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary block mb-1.5">
                Display name
              </label>

              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                className="field"
              />
            </div>

            <div>
              <label className="text-xs text-text-tertiary block mb-1.5">
                Timezone
              </label>

              <input
                value={timezone}
                onChange={(event) => {
                  setTimezone(event.target.value);
                  setSaved(false);
                }}
                className="field"
              />
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader
            title="Appearance"
            eyebrow="Theme & layout"
            action={<Palette className="h-4 w-4 text-text-tertiary" />}
          />

          <div className="space-y-2 mb-5">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setSettings((current) => ({
                    ...current,
                    theme: theme.id,
                  }));

                  setSaved(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors",
                  settings.theme === theme.id
                    ? "border-accent-blue/40 bg-white/[0.04]"
                    : "border-white/10 hover:bg-white/[0.03]",
                )}
              >
                <span
                  className="h-6 w-6 rounded-lg shrink-0"
                  style={{
                    background: theme.swatch,
                  }}
                />

                <span className="text-sm text-text-primary flex-1 text-left">
                  {theme.label}
                </span>

                {settings.theme === theme.id && (
                  <Check className="h-4 w-4 text-accent-blue-soft" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Layout className="h-4 w-4 text-text-tertiary" />
              Collapsed sidebar by default
            </div>

            <Toggle
              checked={settings.sidebarCollapsed}
              onChange={(value) => updateBoolean("sidebarCollapsed", value)}
            />
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader
            title="Notifications"
            action={<Bell className="h-4 w-4 text-text-tertiary" />}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Daily mission reminders
              </span>

              <Toggle
                checked={settings.dailyMissionReminders}
                onChange={(value) =>
                  updateBoolean("dailyMissionReminders", value)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Weekly review email
              </span>

              <Toggle
                checked={settings.weeklyReviewEmail}
                onChange={(value) => updateBoolean("weeklyReviewEmail", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Habit streak alerts
              </span>

              <Toggle
                checked={settings.habitStreakAlerts}
                onChange={(value) => updateBoolean("habitStreakAlerts", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Job application follow-ups
              </span>

              <Toggle
                checked={settings.jobApplicationFollowUps}
                onChange={(value) =>
                  updateBoolean("jobApplicationFollowUps", value)
                }
              />
            </div>
          </div>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader
            title="Goals"
            eyebrow="Weekly targets"
            action={<Target className="h-4 w-4 text-text-tertiary" />}
          />

          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary block mb-1.5">
                Weekly focus time goal (hours)
              </label>

              <input
                type="number"
                min={0}
                max={168}
                value={settings.weeklyFocusHours}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    weeklyFocusHours: Number(event.target.value),
                  }));

                  setSaved(false);
                }}
                className="field"
              />
            </div>

            <div>
              <label className="text-xs text-text-tertiary block mb-1.5">
                Weekly score goal (%)
              </label>

              <input
                type="number"
                min={0}
                max={100}
                value={settings.weeklyScoreGoal}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    weeklyScoreGoal: Number(event.target.value),
                  }));

                  setSaved(false);
                }}
                className="field"
              />
            </div>
          </div>
        </Card>

        {/* Language */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Language"
            action={<Globe className="h-4 w-4 text-text-tertiary" />}
          />

          <div className="flex flex-wrap gap-2">
            {languages.map((language) => (
              <button
                key={language.id}
                type="button"
                onClick={() => {
                  setSettings((current) => ({
                    ...current,
                    language: language.id,
                  }));

                  setSaved(false);
                }}
              >
                <Badge
                  tone={settings.language === language.id ? "blue" : "neutral"}
                  className="cursor-pointer"
                >
                  {language.label}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Save */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save settings"}
          </button>

          {saved && (
            <span className="text-xs text-emerald-400">
              Settings saved successfully.
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
