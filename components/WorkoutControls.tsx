"use client";

import type { WorkoutStatus } from "@/types/fitness";

interface WorkoutControlsProps {
  workoutStatus: WorkoutStatus;
  isCameraActive: boolean;
  isMuted: boolean;
  onStartWorkout: () => void;
  onPauseWorkout: () => void;
  onResumeWorkout: () => void;
  onEndWorkout: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  layout?: "horizontal" | "vertical";
}

export default function WorkoutControls({
  workoutStatus,
  isCameraActive,
  isMuted,
  onStartWorkout,
  onPauseWorkout,
  onResumeWorkout,
  onEndWorkout,
  onReset,
  onToggleMute,
  layout = "horizontal",
}: WorkoutControlsProps) {
  if (!isCameraActive) return null;

  const vertical = layout === "vertical";
  const btnClass = vertical ? "w-full justify-center py-2.5" : "px-4 py-2";

  return (
    <div
      className={`trainer-panel pointer-events-auto ${
        vertical
          ? "flex flex-col gap-1.5 p-2"
          : "overlay-panel-strong flex flex-wrap items-center justify-center gap-2 p-2 sm:gap-2.5"
      }`}
    >
      <p className={`text-[9px] font-semibold uppercase tracking-wider text-slate-500 ${vertical ? "px-1" : "hidden"}`}>
        Workout
      </p>

      {workoutStatus === "idle" && (
        <button type="button" onClick={onStartWorkout} className={`btn-primary ${btnClass}`}>
          Start Workout
        </button>
      )}

      {workoutStatus === "active" && (
        <>
          <button type="button" onClick={onPauseWorkout} className={`btn-secondary ${btnClass}`}>
            Pause
          </button>
          <button
            type="button"
            onClick={onEndWorkout}
            className={`rounded-xl border border-neon-pink/40 bg-neon-pink/15 text-sm font-semibold text-neon-pink transition hover:bg-neon-pink/25 ${btnClass}`}
          >
            End Workout
          </button>
        </>
      )}

      {workoutStatus === "paused" && (
        <>
          <button type="button" onClick={onResumeWorkout} className={`btn-primary ${btnClass}`}>
            Resume
          </button>
          <button
            type="button"
            onClick={onEndWorkout}
            className={`rounded-xl border border-neon-pink/40 bg-neon-pink/15 text-sm font-semibold text-neon-pink transition hover:bg-neon-pink/25 ${btnClass}`}
          >
            End Workout
          </button>
        </>
      )}

      {workoutStatus === "ended" && (
        <span className="px-2 py-2 text-center text-[11px] font-medium text-slate-400">
          Workout ended — view summary
        </span>
      )}

      <div className={vertical ? "flex gap-1.5" : "contents"}>
        <button type="button" onClick={onReset} className={`btn-secondary ${vertical ? "flex-1 py-2" : btnClass}`}>
          Reset
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className={`btn-icon ${vertical ? "shrink-0" : ""} ${isMuted ? "border-neon-pink/40 text-neon-pink" : "border-neon-cyan/40 text-neon-cyan"}`}
          title={isMuted ? "Unmute voice coach" : "Mute voice coach"}
        >
        {isMuted ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>
      </div>
    </div>
  );
}
