"use client";

import { EXERCISE_MAP } from "@/lib/exerciseRegistry";
import { formatMuscleGroups } from "@/lib/gymSessionTracker";
import type {
  AnalyzableExerciseType,
  ExerciseType,
  GymExerciseLogEntry,
  WorkoutSuggestion,
} from "@/types/fitness";

interface WorkoutSuggestionsProps {
  suggestions: WorkoutSuggestion[];
  gymLog: GymExerciseLogEntry[];
  detectedExercise?: AnalyzableExerciseType;
  isAutoDetect: boolean;
  onSelectExercise: (exercise: ExerciseType) => void;
}

export default function WorkoutSuggestions({
  suggestions,
  gymLog,
  detectedExercise,
  isAutoDetect,
  onSelectExercise,
}: WorkoutSuggestionsProps) {
  const detected = detectedExercise ? EXERCISE_MAP[detectedExercise] : null;

  return (
    <div className="trainer-panel pointer-events-auto w-full p-3">
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-neon-cyan/70">
        AI Coach Tips
      </p>

      {isAutoDetect && detected && (
        <div className="mb-2 rounded-lg border border-neon-green/30 bg-neon-green/10 px-2 py-1.5">
          <p className="text-[8px] uppercase text-slate-400">Detected</p>
          <p className="text-xs font-bold text-neon-green">
            {detected.icon} {detected.label}
          </p>
        </div>
      )}

      {gymLog.length > 0 && (
        <div className="mb-2">
          <p className="text-[8px] uppercase text-slate-500">Session so far</p>
          <p className="text-[10px] leading-tight text-slate-300">
            {gymLog.map((e) => `${e.icon}${e.reps > 0 ? ` ${e.reps}` : ""}`).join(" · ")}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[8px] uppercase text-slate-500">Try next</p>
        {suggestions.length === 0 ? (
          <p className="text-[10px] text-slate-400">Keep going — great work!</p>
        ) : (
          suggestions.slice(0, 3).map((s) => (
            <button
              key={s.exercise}
              type="button"
              onClick={() => onSelectExercise(s.exercise)}
              className={`w-full rounded-lg border px-2 py-1.5 text-left transition hover:bg-white/10 ${
                s.priority === "high"
                  ? "border-neon-cyan/30 bg-neon-cyan/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span className="text-xs font-semibold text-white">
                {s.icon} {s.label}
              </span>
              <p className="mt-0.5 text-[9px] leading-tight text-slate-400">
                {s.reason}
              </p>
            </button>
          ))
        )}
      </div>

      {gymLog.length > 0 && (
        <p className="mt-2 text-[8px] text-slate-500">
          Trained: {formatMuscleGroups([...new Set(gymLog.flatMap((e) => e.muscleGroups))].slice(0, 4))}
        </p>
      )}
    </div>
  );
}
