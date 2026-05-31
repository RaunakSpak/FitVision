"use client";

import { formatDuration } from "@/lib/poseUtils";
import type { AnalyzerMetrics, ExerciseStats, ExerciseType } from "@/types/fitness";

interface StatsPanelProps {
  exercise: ExerciseType;
  stats: ExerciseStats;
  metrics?: AnalyzerMetrics;
  topMistakes?: { id: string; label: string; count: number }[];
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums leading-tight ${color}`}>
        {value}
      </p>
    </div>
  );
}

function formScoreColor(score: number): string {
  if (score >= 80) return "text-neon-green";
  if (score >= 50) return "text-neon-cyan";
  return "text-neon-pink";
}

function phaseColor(phase: string): string {
  if (
    phase === "UP" ||
    phase === "STANDING" ||
    phase === "EXTENDED" ||
    phase === "HOLD"
  ) {
    return "text-neon-green";
  }
  if (phase === "DOWN" || phase === "CURL") return "text-neon-pink";
  return "text-neon-cyan";
}

function RepStatsOverlay({
  stats,
}: {
  stats: Extract<ExerciseStats, { kind: "reps" }>;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Total" value={stats.totalReps} color="text-neon-cyan" />
        <MiniStat label="Good" value={stats.goodReps} color="text-neon-green" />
        <MiniStat label="Bad" value={stats.badReps} color="text-neon-pink" />
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
        <MiniStat
          label="Phase"
          value={stats.currentPhase}
          color={phaseColor(stats.currentPhase)}
        />
        <MiniStat
          label="Form"
          value={stats.formScore}
          color={formScoreColor(stats.formScore)}
        />
      </div>
    </div>
  );
}

function PlankStatsOverlay({
  stats,
  metrics,
}: {
  stats: Extract<ExerciseStats, { kind: "plank" }>;
  metrics?: AnalyzerMetrics;
}) {
  const duration = metrics?.duration ?? stats.duration;
  return (
    <div className="space-y-2">
      <div className="text-center">
        <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
          Hold Time
        </p>
        <p className="font-mono text-2xl font-black tabular-nums text-neon-purple">
          {formatDuration(duration)}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat
          label="Best"
          value={formatDuration(stats.bestHoldTime)}
          color="text-neon-green"
        />
        <MiniStat
          label="Bad"
          value={formatDuration(stats.badFormSeconds)}
          color="text-neon-pink"
        />
        <MiniStat
          label="Form"
          value={stats.formScore}
          color={formScoreColor(stats.formScore)}
        />
      </div>
    </div>
  );
}

export default function StatsPanel({ stats, metrics, topMistakes }: StatsPanelProps) {
  return (
    <div className="trainer-panel pointer-events-none w-full p-3">
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-neon-cyan/70">
        Stats
      </p>
      {stats.kind === "plank" ? (
        <PlankStatsOverlay stats={stats} metrics={metrics} />
      ) : (
        <RepStatsOverlay stats={stats} />
      )}
      {topMistakes && topMistakes.length > 0 && (
        <div className="mt-2 border-t border-white/10 pt-2">
          <p className="mb-1 text-[8px] uppercase tracking-wider text-slate-500">
            Mistakes
          </p>
          <div className="flex flex-wrap gap-1">
            {topMistakes.slice(0, 2).map((m) => (
              <span
                key={m.id}
                className="rounded bg-neon-pink/15 px-1.5 py-0.5 text-[8px] text-neon-pink"
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
