"use client";

import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { formatDuration } from "@/lib/poseUtils";
import { gradeColor } from "@/lib/scoringUtils";
import type { WorkoutRecord } from "@/lib/api";

interface WorkoutHistoryProps {
  open: boolean;
  onClose: () => void;
  workouts: WorkoutRecord[];
  loading: boolean;
  error: string | null;
  onDelete: (id: number) => void;
  onRefresh: () => void;
  isAuthenticated?: boolean;
  onLoginClick?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WorkoutHistory({
  open,
  onClose,
  workouts,
  loading,
  error,
  onDelete,
  onRefresh,
  isAuthenticated = true,
  onLoginClick,
}: WorkoutHistoryProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-black/95 shadow-neon animate-slide-up pb-16 md:pb-0">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="text-lg font-bold text-white">Workout History</h2>
            <p className="text-xs text-slate-400">{workouts.length} saved sessions</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onRefresh} className="btn-icon" title="Refresh">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button type="button" onClick={onClose} className="btn-icon" title="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!isAuthenticated && (
            <EmptyState
              icon="🔐"
              title="Sign in required"
              description="Create an account to save and view your workout history."
              actionLabel="Sign In"
              onAction={onLoginClick}
            />
          )}

          {isAuthenticated && loading && <LoadingState message="Loading history…" />}

          {isAuthenticated && error && (
            <ErrorState
              title="Failed to load history"
              message={error}
              variant={error.includes("reach the API") ? "offline" : "error"}
              actionLabel="Retry"
              onAction={onRefresh}
            />
          )}

          {isAuthenticated && !loading && workouts.length === 0 && !error && (
            <EmptyState
              icon="📋"
              title="No saved workouts yet"
              description="End a live session or video analysis and tap Save Workout to build your history."
            />
          )}

          <div className="space-y-3">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-neon-cyan/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">
                      {w.exercise_label || w.exercise_type}
                    </p>
                    <p className="text-[10px] text-slate-500">{formatDate(w.created_at)}</p>
                  </div>
                  <span
                    className={`rounded-lg px-2 py-1 text-sm font-black ${gradeColor(w.grade as "A" | "B" | "C" | "D")}`}
                  >
                    {w.grade}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Reps</p>
                    <p className="font-bold text-neon-cyan">{w.total_reps}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Score</p>
                    <p className="font-bold text-neon-green">{Math.round(w.form_score)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Time</p>
                    <p className="font-bold text-neon-purple">
                      {formatDuration(w.duration_seconds)}
                    </p>
                  </div>
                </div>

                {w.mistakes && w.mistakes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {w.mistakes.slice(0, 3).map((m) => (
                      <span
                        key={m.id}
                        className="rounded bg-neon-pink/10 px-1.5 py-0.5 text-[9px] text-neon-pink"
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onDelete(w.id)}
                  className="mt-3 text-[10px] text-slate-500 hover:text-neon-pink"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
