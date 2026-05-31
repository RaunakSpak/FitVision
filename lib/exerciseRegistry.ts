import type { AnalyzableExerciseType, MuscleGroup } from "@/types/fitness";

export interface ExerciseInfo {
  id: AnalyzableExerciseType | "auto_detect";
  label: string;
  icon: string;
  description: string;
  color: "cyan" | "green" | "pink" | "purple";
}

export interface ExerciseDefinition {
  id: AnalyzableExerciseType;
  label: string;
  icon: string;
  description: string;
  color: "cyan" | "green" | "pink" | "purple";
  muscleGroups: MuscleGroup[];
  category: "push" | "pull" | "legs" | "core" | "arms" | "cardio";
  movementPattern: string;
}

export const EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
  { id: "pushup", label: "Push-up", icon: "💪", description: "Chest & triceps", color: "cyan", muscleGroups: ["chest", "triceps", "shoulders"], category: "push", movementPattern: "horizontal_push" },
  { id: "squat", label: "Squat", icon: "🦵", description: "Quads & glutes", color: "green", muscleGroups: ["quads", "glutes", "core"], category: "legs", movementPattern: "squat" },
  { id: "lunge", label: "Lunge", icon: "🚶", description: "Single-leg strength", color: "green", muscleGroups: ["quads", "glutes", "hamstrings"], category: "legs", movementPattern: "lunge" },
  { id: "deadlift", label: "Deadlift", icon: "🏋️", description: "Hip hinge / posterior", color: "purple", muscleGroups: ["hamstrings", "glutes", "back", "core"], category: "pull", movementPattern: "hinge" },
  { id: "plank", label: "Plank", icon: "🧘", description: "Core stability", color: "purple", muscleGroups: ["core", "shoulders"], category: "core", movementPattern: "isometric" },
  { id: "shoulder_press", label: "Shoulder Press", icon: "⬆️", description: "Overhead press", color: "cyan", muscleGroups: ["shoulders", "triceps", "core"], category: "push", movementPattern: "vertical_push" },
  { id: "lateral_raise", label: "Lateral Raise", icon: "↔️", description: "Side delts", color: "cyan", muscleGroups: ["shoulders"], category: "push", movementPattern: "lateral_raise" },
  { id: "bicep_curl", label: "Bicep Curl", icon: "💪", description: "Biceps", color: "pink", muscleGroups: ["biceps", "forearms"], category: "arms", movementPattern: "curl" },
  { id: "high_knee", label: "High Knees", icon: "🏃", description: "Cardio / warm-up", color: "green", muscleGroups: ["quads", "core", "cardio"], category: "cardio", movementPattern: "cardio" },
];

export const EXERCISE_MAP = Object.fromEntries(
  EXERCISE_DEFINITIONS.map((e) => [e.id, e])
) as Record<AnalyzableExerciseType, ExerciseDefinition>;

export function getExerciseDef(id: AnalyzableExerciseType): ExerciseDefinition {
  return EXERCISE_MAP[id];
}

export function getExerciseLabel(id: AnalyzableExerciseType): string {
  return EXERCISE_MAP[id]?.label ?? id;
}

export function getExerciseIcon(id: AnalyzableExerciseType): string {
  return EXERCISE_MAP[id]?.icon ?? "🏋️";
}

/** Legacy catalog shape for UI components */
export const EXERCISE_CATALOG = EXERCISE_DEFINITIONS.map(
  ({ id, label, icon, description, color }) => ({
    id,
    label,
    icon,
    description,
    color,
  })
);

export const AUTO_DETECT_OPTION = {
  id: "auto_detect" as const,
  label: "Gym AI",
  icon: "🤖",
  description: "Auto-detect your movement",
  color: "cyan" as const,
};

export const ALL_SELECTOR_OPTIONS = [AUTO_DETECT_OPTION, ...EXERCISE_CATALOG];

export function isAnalyzable(id: string): id is AnalyzableExerciseType {
  return id in EXERCISE_MAP;
}
