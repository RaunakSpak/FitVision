"use client";

import {
  AUTO_DETECT_OPTION,
  EXERCISE_CATALOG,
  type ExerciseInfo,
} from "@/lib/exerciseRegistry";
import type { ExerciseType } from "@/types/fitness";

interface ExerciseSelectorProps {
  selected: ExerciseType;
  onSelect: (exercise: ExerciseType) => void;
  compact?: boolean;
  layout?: "bar" | "sidebar";
}

const COLOR_MAP: Record<
  ExerciseInfo["color"],
  { active: string; idle: string }
> = {
  cyan: {
    active: "bg-neon-cyan/25 text-neon-cyan ring-1 ring-neon-cyan/50",
    idle: "text-slate-300 hover:bg-white/10 hover:text-white",
  },
  green: {
    active: "bg-neon-green/25 text-neon-green ring-1 ring-neon-green/50",
    idle: "text-slate-300 hover:bg-white/10 hover:text-white",
  },
  pink: {
    active: "bg-neon-pink/25 text-neon-pink ring-1 ring-neon-pink/50",
    idle: "text-slate-300 hover:bg-white/10 hover:text-white",
  },
  purple: {
    active: "bg-neon-purple/25 text-neon-purple ring-1 ring-neon-purple/50",
    idle: "text-slate-300 hover:bg-white/10 hover:text-white",
  },
};

export default function ExerciseSelector({
  selected,
  onSelect,
  compact = false,
  layout = "bar",
}: ExerciseSelectorProps) {
  const gymSelected = selected === "auto_detect";
  const gymColors = COLOR_MAP.cyan;
  const isSidebar = layout === "sidebar";

  return (
    <div className={`trainer-panel pointer-events-auto p-2 ${isSidebar ? "flex max-h-[min(42vh,320px)] flex-col" : ""}`}>
      <p className={`mb-2 font-semibold uppercase tracking-wider text-slate-500 ${
        isSidebar ? "text-left text-[9px]" : "text-center text-[9px]"
      }`}>
        {compact || isSidebar ? "Exercise" : "Gym AI or pick exercise"}
      </p>

      <button
        type="button"
        onClick={() => onSelect("auto_detect")}
        className={`mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
          isSidebar ? "justify-start" : "justify-center py-2.5"
        } ${
          gymSelected
            ? `${gymColors.active} shadow-neon`
            : "bg-white/5 text-slate-200 hover:bg-neon-cyan/10 hover:text-neon-cyan"
        }`}
      >
        <span>{AUTO_DETECT_OPTION.icon}</span>
        <span className={isSidebar ? "text-left" : ""}>{AUTO_DETECT_OPTION.label}</span>
        {!isSidebar && (
          <span className="text-[10px] font-normal opacity-70">— detects any move</span>
        )}
      </button>

      <div
        className={
          isSidebar
            ? "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5"
            : "flex max-h-24 flex-wrap items-center justify-center gap-1 overflow-y-auto sm:max-h-none"
        }
      >
        {EXERCISE_CATALOG.map((exercise) => {
          const isSelected = selected === exercise.id;
          const colors = COLOR_MAP[exercise.color];
          return (
            <button
              key={exercise.id}
              type="button"
              onClick={() => onSelect(exercise.id)}
              title={exercise.description}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                isSidebar ? "w-full justify-start text-left" : "gap-1 text-[10px] sm:text-xs"
              } ${isSelected ? colors.active : colors.idle}`}
            >
              <span>{exercise.icon}</span>
              <span className={isSidebar || !compact ? "" : "hidden sm:inline"}>
                {exercise.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
