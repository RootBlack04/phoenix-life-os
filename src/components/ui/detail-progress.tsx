import { ProgressBar } from "@/components/ui/progress-bar";

export function DetailProgress({ label, percent }: { label: string; percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="font-mono-num text-xs text-text-tertiary">{percent}%</span>
      </div>
      <ProgressBar percent={percent} height={6} />
    </div>
  );
}
