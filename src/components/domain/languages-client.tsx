"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, BookOpen, Clock3 } from "lucide-react";

import { addLanguageStudySession, setLanguageSkills } from "@/lib/db/actions";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { DetailProgress } from "@/components/ui/detail-progress";
import { LanguageChart } from "@/components/charts/language-chart";

type SkillKey =
  | "vocabulary"
  | "grammar"
  | "listening"
  | "speaking"
  | "writing"
  | "reading";

type StudySession = {
  id: string;
  date: string;
  minutes: number;
  skill: string;
  note?: string | null;
};

type Language = {
  id: string;
  name: string;
  flag: string;
  currentLevel: string;
  targetLevel: string;
  percent: number;
  vocabulary: number;
  grammar: number;
  listening: number;
  speaking: number;
  writing: number;
  reading: number;
  hoursLogged: number;
  dailyGoalMinutes: number;
  weeklyGoalHours: number;
  weeklyTrend: {
    week: string;
    score: number;
  }[];
  studySessions: StudySession[];
};

const skills: {
  key: SkillKey;
  label: string;
}[] = [
  { key: "vocabulary", label: "Vocabulary" },
  { key: "grammar", label: "Grammar" },
  { key: "listening", label: "Listening" },
  { key: "speaking", label: "Speaking" },
  { key: "writing", label: "Writing" },
  { key: "reading", label: "Reading" },
];

const studySkills: SkillKey[] = [
  "vocabulary",
  "grammar",
  "listening",
  "speaking",
  "writing",
  "reading",
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatSessionDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function skillLabel(skill: string) {
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

export function LanguagesClient({
  initialLanguages,
}: {
  initialLanguages: Language[];
}) {
  const [languages, setLanguages] = useState(initialLanguages);
  const [pending, startTransition] = useTransition();

  const [openLog, setOpenLog] = useState<string | null>(null);

  const [sessionForm, setSessionForm] = useState<{
    minutes: number;
    skill: SkillKey;
    note: string;
  }>({
    minutes: 30,
    skill: "listening",
    note: "",
  });

  function adjustSkill(languageId: string, skill: SkillKey, delta: number) {
    const language = languages.find((item) => item.id === languageId);

    if (!language) return;

    const nextValue = clamp(language[skill] + delta);

    if (nextValue === language[skill]) return;

    const updated = {
      ...language,
      [skill]: nextValue,
    };

    setLanguages((current) =>
      current.map((item) => (item.id === languageId ? updated : item)),
    );

    startTransition(async () => {
      await setLanguageSkills({
        id: languageId,
        percent: updated.percent,
        vocabulary: updated.vocabulary,
        grammar: updated.grammar,
        listening: updated.listening,
        speaking: updated.speaking,
        writing: updated.writing,
        reading: updated.reading,
      });
    });
  }

  function submitStudySession(language: Language) {
    const minutes = Number(sessionForm.minutes);

    if (!Number.isInteger(minutes) || minutes <= 0) {
      return;
    }

    startTransition(async () => {
      await addLanguageStudySession({
        languageId: language.id,
        date: new Date(),
        minutes,
        skill: sessionForm.skill,
        note: sessionForm.note.trim() || undefined,
      });

      setLanguages((current) =>
        current.map((item) =>
          item.id === language.id
            ? {
                ...item,
                studySessions: [
                  {
                    id: `local-${Date.now()}`,
                    date: new Date().toISOString(),
                    minutes,
                    skill: sessionForm.skill,
                    note: sessionForm.note.trim() || null,
                  },
                  ...item.studySessions,
                ],
              }
            : item,
        ),
      );

      setSessionForm({
        minutes: 30,
        skill: "listening",
        note: "",
      });

      setOpenLog(null);
    });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {languages.map((language) => (
        <Card key={language.id}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{language.flag}</span>

              <div>
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {language.name}
                </h3>

                <div className="flex items-center gap-2 mt-1">
                  <Badge tone="blue">{language.currentLevel}</Badge>

                  <span className="text-text-tertiary text-xs">→</span>

                  <Badge tone="purple">{language.targetLevel} target</Badge>
                </div>
              </div>
            </div>

            <ProgressRing
              percent={language.percent}
              size={72}
              strokeWidth={6}
              color="var(--accent-blue)"
              colorTo="var(--accent-purple)"
            >
              <span className="font-display text-sm font-bold">
                {language.percent}%
              </span>
            </ProgressRing>
          </div>

          <div className="space-y-3 mb-5">
            {skills.map((skill) => (
              <div
                key={skill.key}
                className="grid grid-cols-[1fr_auto] gap-3 items-center"
              >
                <DetailProgress
                  label={skill.label}
                  percent={language[skill.key]}
                />

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pending || language[skill.key] <= 0}
                    onClick={() => adjustSkill(language.id, skill.key, -5)}
                    aria-label={`Decrease ${skill.label}`}
                    className="h-7 w-7 rounded-lg glass flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>

                  <span className="font-mono-num text-xs text-text-secondary w-8 text-center">
                    {language[skill.key]}%
                  </span>

                  <button
                    type="button"
                    disabled={pending || language[skill.key] >= 100}
                    onClick={() => adjustSkill(language.id, skill.key, 5)}
                    aria-label={`Increase ${skill.label}`}
                    className="h-7 w-7 rounded-lg glass flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="glass rounded-xl p-3 text-center">
              <p className="font-display text-lg font-bold text-text-primary">
                {language.hoursLogged}h
              </p>

              <p className="text-[10px] text-text-tertiary mt-0.5">
                Hours logged
              </p>
            </div>

            <div className="glass rounded-xl p-3 text-center">
              <p className="font-display text-lg font-bold text-text-primary">
                {language.dailyGoalMinutes}m
              </p>

              <p className="text-[10px] text-text-tertiary mt-0.5">
                Daily goal
              </p>
            </div>

            <div className="glass rounded-xl p-3 text-center">
              <p className="font-display text-lg font-bold text-text-primary">
                {language.weeklyGoalHours}h
              </p>

              <p className="text-[10px] text-text-tertiary mt-0.5">
                Weekly goal
              </p>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-tertiary">
                  CEFR Progress
                </p>
              </div>
            </div>

            <div className="h-[120px] -ml-4">
              <LanguageChart data={language.weeklyTrend} />
            </div>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent-blue" />

                <h4 className="text-sm font-semibold text-text-primary">
                  Study Log
                </h4>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpenLog(openLog === language.id ? null : language.id)
                }
                className="text-xs px-3 py-1.5 rounded-lg glass text-text-secondary hover:text-text-primary transition-colors"
              >
                {openLog === language.id ? "Cancel" : "Add session"}
              </button>
            </div>

            {openLog === language.id && (
              <div className="glass rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-text-tertiary">
                    Minutes
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={sessionForm.minutes}
                      onChange={(event) =>
                        setSessionForm((current) => ({
                          ...current,
                          minutes: Number(event.target.value),
                        }))
                      }
                      className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue/50"
                    />
                  </label>

                  <label className="text-xs text-text-tertiary">
                    Skill
                    <select
                      value={sessionForm.skill}
                      onChange={(event) =>
                        setSessionForm((current) => ({
                          ...current,
                          skill: event.target.value as SkillKey,
                        }))
                      }
                      className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue/50"
                    >
                      {studySkills.map((skill) => (
                        <option key={skill} value={skill}>
                          {skillLabel(skill)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-xs text-text-tertiary">
                  Note
                  <input
                    type="text"
                    maxLength={500}
                    value={sessionForm.note}
                    onChange={(event) =>
                      setSessionForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="What did you study?"
                    className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue/50"
                  />
                </label>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => submitStudySession(language)}
                  className="w-full rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 px-3 py-2 text-sm font-medium text-text-primary transition-colors"
                >
                  {pending ? "Saving..." : "Save session"}
                </button>
              </div>
            )}

            {language.studySessions.length === 0 ? (
              <div className="glass rounded-xl p-4 text-center">
                <Clock3 className="h-4 w-4 mx-auto mb-2 text-text-tertiary" />

                <p className="text-xs text-text-tertiary">
                  No study sessions yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {language.studySessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="glass rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary">
                        {session.minutes} min · {skillLabel(session.skill)}
                      </p>

                      {session.note && (
                        <p className="text-[10px] text-text-tertiary truncate mt-0.5">
                          {session.note}
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] text-text-tertiary shrink-0">
                      {formatSessionDate(session.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
