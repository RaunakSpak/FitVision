"use client";

import { formatDuration } from "@/lib/poseUtils";
import { formatMuscleGroups } from "@/lib/gymSessionTracker";
import { gradeColor } from "@/lib/scoringUtils";
import type { SessionSummaryData } from "@/types/fitness";

interface SessionSummaryProps {
  summary: SessionSummaryData;
  onClose: () => void;
  onNewWorkout: () => void;
  onTrySuggestion?: (exercise: string) => void;
  isAuthenticated?: boolean;
  onLoginClick?: () => void;
  onSaveWorkout?: () => Promise<void>;
  saving?: boolean;
  saveSuccess?: boolean;
  saveError?: string | null;
}

function SummaryStat({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="glass-card-inner rounded-xl p-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

export default function SessionSummary({
  summary,
  onClose,
  onNewWorkout,
  onTrySuggestion,
  isAuthenticated = false,
  onLoginClick,
  onSaveWorkout,
  saving = false,
  saveSuccess = false,
  saveError = null,
}: SessionSummaryProps) {
  const isPlank =
    !summary.isGymMode && summary.exercise === "plank";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="glass-card relative max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/15 p-6 shadow-neon animate-slide-up">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan/80">
              Session Complete
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {summary.exerciseIcon} {summary.exerciseLabel}
            </h2>
            {summary.isGymMode && summary.muscleGroupsTrained.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Muscles: {formatMuscleGroups(summary.muscleGroupsTrained)}
              </p>
            )}
          </div>
          <div
            className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/5 ${gradeColor(summary.grade)}`}
          >
            <span className="text-3xl font-black">{summary.grade}</span>
            <span className="text-[9px] uppercase tracking-wider opacity-70">
              Grade
            </span>
          </div>
        </div>

        {summary.mlAssistSummary?.used && (
          <div className="mb-4 rounded-xl border border-neon-purple/25 bg-neon-purple/10 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neon-purple">
              Experimental ML Assist
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Avg confidence {Math.round(summary.mlAssistSummary.avgConfidence * 100)}% ·{" "}
              {summary.mlAssistSummary.adjustedFrames} adjusted frames
              {summary.mlAssistSummary.topMlMistake &&
                ` · Top ML signal: ${summary.mlAssistSummary.topMlMistake}`}
            </p>
            <p className="mt-1 text-[9px] text-slate-500">
              Not medical advice. Rule-based scoring remains primary.
            </p>
          </div>
        )}

        {summary.isGymMode && summary.gymLog.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Exercises performed
            </p>
            <div className="space-y-2">
              {summary.gymLog.map((entry) => (
                <div
                  key={entry.exercise}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="text-sm font-medium text-white">
                    {entry.icon} {entry.label}
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    {entry.reps > 0
                      ? `${entry.reps} reps (${entry.goodReps} good)`
                      : formatDuration(entry.durationSeconds)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryStat
            label="Duration"
            value={formatDuration(summary.durationSeconds)}
            accent="text-neon-purple"
          />
          <SummaryStat
            label="Form Score"
            value={`${summary.formScore}/100`}
            accent="text-neon-cyan"
          />
          {!isPlank && !summary.isGymMode && (
            <>
              <SummaryStat label="Total Reps" value={summary.totalReps} accent="text-neon-cyan" />
              <SummaryStat label="Good Reps" value={summary.goodReps} accent="text-neon-green" />
              <SummaryStat label="Bad Reps" value={summary.badReps} accent="text-neon-pink" />
            </>
          )}
          {isPlank && (
            <SummaryStat
              label="Best Hold"
              value={formatDuration(summary.bestPlankHold)}
              accent="text-neon-green"
            />
          )}
        </div>

        {summary.suggestions.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recommended for next session
            </p>
            <div className="space-y-2">
              {summary.suggestions.map((s) => (
                <div
                  key={s.exercise}
                  className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-neon-cyan">
                    {s.icon} {s.label}
                  </p>
                  <p className="text-xs text-slate-400">{s.reason}</p>
                  {onTrySuggestion && (
                    <button
                      type="button"
                      onClick={() => onTrySuggestion(s.exercise)}
                      className="mt-1 text-[10px] font-medium text-neon-cyan underline"
                    >
                      Train this next
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.topMistakes.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Main Mistakes
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.topMistakes.map((mistake) => (
                <span
                  key={mistake.id}
                  className="rounded-full border border-neon-pink/30 bg-neon-pink/10 px-3 py-1 text-xs font-medium text-neon-pink"
                >
                  {mistake.label}
                  <span className="ml-1.5 opacity-70">×{mistake.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isAuthenticated && onSaveWorkout && (
            <button
              type="button"
              onClick={onSaveWorkout}
              disabled={saving || saveSuccess}
              className="btn-primary w-full py-3 disabled:opacity-60"
            >
              {saving
                ? "Saving…"
                : saveSuccess
                  ? "✓ Saved to History"
                  : "Save Workout"}
            </button>
          )}
          {!isAuthenticated && onLoginClick && (
            <button
              type="button"
              onClick={onLoginClick}
              className="w-full rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 py-3 text-sm font-semibold text-neon-cyan hover:bg-neon-cyan/20"
            >
              Sign in to save this workout
            </button>
          )}
          {saveError && (
            <p className="text-center text-xs text-neon-pink">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-center text-xs text-neon-green">
              Workout saved to your history
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onNewWorkout} className="btn-primary flex-1">
              New Workout
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
