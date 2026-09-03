"use client";

type LanguageChartProps = {
  data: {
    week: string;
    score: number;
  }[];
};

export function LanguageChart({ data }: LanguageChartProps) {
  if (!data.length) return <p className="text-xs text-text-tertiary">No stored assessments yet.</p>;
  return (
    <ul aria-label="Stored assessment observations" className="space-y-2 max-h-40 overflow-y-auto">
      {data.map((point, index) => (
        <li key={index} className="flex justify-between gap-3 rounded-lg glass px-3 py-2 text-xs">
          <span className="text-text-tertiary break-words min-w-0">Stored label: {point.week}</span>
          <span className="text-text-primary shrink-0">Score: {point.score}</span>
        </li>
      ))}
    </ul>
  );
}
