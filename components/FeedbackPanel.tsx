"use client";

import type { AnalyzerMetrics, ExerciseType, WorkoutStatus } from "@/types/fitness";

interface FeedbackPanelProps {
  exercise: ExerciseType;
  feedback: string;
  isGoodForm: boolean;
  poseDetected: boolean;
  formScore?: number;
  metrics?: AnalyzerMetrics;
  workoutStatus?: WorkoutStatus;
  variant?: "center" | "side";
}

function formScoreColor(score: number): string {
  if (score >= 80) return "text-neon-green";
  if (score >= 50) return "text-neon-cyan";
  return "text-neon-pink";
}

function formScoreBarColor(score: number): string {
  if (score >= 80) return "bg-neon-green";
  if (score >= 50) return "bg-neon-cyan";
  return "bg-neon-pink";
}

export default function FeedbackPanel({
  feedback,
  isGoodForm,
  poseDetected,
  formScore,
  workoutStatus,
  variant = "center",
}: FeedbackPanelProps) {
  const feedbackColor = !poseDetected
    ? "text-slate-300"
    : isGoodForm
      ? "text-neon-green"
      : "text-neon-pink";

  const borderClass = poseDetected
    ? isGoodForm
      ? "border-neon-green/35"
      : "border-neon-pink/35"
    : "border-white/10";

  const message = !poseDetected ? "Step into frame…" : feedback;
  const isSide = variant === "side";

  return (
    <div
      className={`trainer-panel pointer-events-none border transition-all duration-300 ${borderClass} ${
        isSide
          ? "w-full px-3 py-2.5 text-left"
          : "overlay-panel-strong max-w-2xl border-2 px-5 py-4 text-center shadow-lg"
      }`}
    >
      <p
        className={`font-semibold uppercase tracking-[0.18em] text-neon-cyan/70 ${
          isSide ? "mb-1 text-[9px]" : "mb-1 text-[10px] tracking-[0.2em]"
        }`}
      >
        AI Coach
        {workoutStatus === "paused" && (
          <span className="ml-1.5 text-neon-purple">· Paused</span>
        )}
      </p>
      <p
        key={feedback}
        className={`font-bold leading-snug ${feedbackColor} animate-slide-up ${
          isSide ? "text-sm sm:text-base" : "text-xl sm:text-2xl md:text-3xl"
        }`}
      >
        {message}
      </p>

      {poseDetected && formScore !== undefined && (
        <div
          className={`mt-2 flex items-center gap-2 ${isSide ? "" : "mx-auto max-w-xs"}`}
        >
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-all duration-500 ${formScoreBarColor(formScore)}`}
              style={{ width: `${formScore}%` }}
            />
          </div>
          <span
            className={`text-[10px] font-bold tabular-nums ${formScoreColor(formScore)}`}
          >
            {formScore}
          </span>
        </div>
      )}
    </div>
  );
}
