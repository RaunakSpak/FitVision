import { EXERCISE_MAP } from "@/lib/exerciseRegistry";
import type {
  AnalyzableExerciseType,
  MuscleGroup,
  WorkoutSuggestion,
  GymExerciseLogEntry,
} from "@/types/fitness";

const COMPLEMENTARY: Record<MuscleGroup, AnalyzableExerciseType[]> = {
  chest: ["deadlift", "lateral_raise", "plank"],
  back: ["pushup", "shoulder_press", "plank"],
  shoulders: ["squat", "deadlift", "plank"],
  biceps: ["shoulder_press", "squat", "lateral_raise"],
  triceps: ["bicep_curl", "deadlift", "lunge"],
  quads: ["deadlift", "shoulder_press", "plank"],
  hamstrings: ["squat", "lunge", "shoulder_press"],
  glutes: ["shoulder_press", "bicep_curl", "plank"],
  core: ["squat", "shoulder_press", "lunge"],
  forearms: ["shoulder_press", "lunge", "high_knee"],
  cardio: ["plank", "squat", "pushup"],
};

const BALANCE_PAIRS: { trained: MuscleGroup[]; suggest: MuscleGroup[]; reason: string }[] = [
  {
    trained: ["chest", "triceps"],
    suggest: ["back"],
    reason: "Balance push with pull for shoulder health",
  },
  {
    trained: ["quads"],
    suggest: ["hamstrings", "glutes"],
    reason: "Posterior chain work prevents muscle imbalance",
  },
  {
    trained: ["biceps"],
    suggest: ["triceps", "shoulders"],
    reason: "Train opposing arm muscles for symmetry",
  },
  {
    trained: ["shoulders"],
    suggest: ["core"],
    reason: "Core stability supports overhead strength",
  },
];

export function getWorkoutSuggestions(
  log: GymExerciseLogEntry[],
  currentExercise?: AnalyzableExerciseType
): WorkoutSuggestion[] {
  const suggestions: WorkoutSuggestion[] = [];
  const performed = new Set(log.map((e) => e.exercise));
  const muscleHit = new Set<MuscleGroup>();
  log.forEach((e) => e.muscleGroups.forEach((m) => muscleHit.add(m)));

  if (log.length === 0) {
    return [
      {
        exercise: "squat",
        label: "Squat",
        icon: "🦵",
        reason: "Start with a compound leg movement to warm up",
        priority: "high",
      },
      {
        exercise: "pushup",
        label: "Push-up",
        icon: "💪",
        reason: "Add upper-body push after legs",
        priority: "medium",
      },
      {
        exercise: "plank",
        label: "Plank",
        icon: "🧘",
        reason: "Finish with core stability",
        priority: "medium",
      },
    ];
  }

  for (const rule of BALANCE_PAIRS) {
    const hit = rule.trained.every((m) => muscleHit.has(m));
    if (!hit) continue;
    for (const muscle of rule.suggest) {
      const candidates = COMPLEMENTARY[muscle] ?? [];
      for (const ex of candidates) {
        if (performed.has(ex) || ex === currentExercise) continue;
        const def = EXERCISE_MAP[ex];
        suggestions.push({
          exercise: ex,
          label: def.label,
          icon: def.icon,
          reason: rule.reason,
          priority: "high",
        });
        if (suggestions.length >= 4) break;
      }
    }
  }

  const categories = new Set(log.map((e) => EXERCISE_MAP[e.exercise].category));
  if (!categories.has("core") && !performed.has("plank")) {
    suggestions.push({
      exercise: "plank",
      label: "Plank",
      icon: "🧘",
      reason: "You haven't trained core yet — add a plank hold",
      priority: "medium",
    });
  }
  if (categories.has("legs") && !categories.has("push") && !performed.has("pushup")) {
    suggestions.push({
      exercise: "pushup",
      label: "Push-up",
      icon: "💪",
      reason: "Legs done — switch to upper body push",
      priority: "high",
    });
  }
  if (categories.has("push") && !categories.has("pull") && !performed.has("deadlift")) {
    suggestions.push({
      exercise: "deadlift",
      label: "Deadlift",
      icon: "🏋️",
      reason: "Add a pull/hinge movement to balance today's push work",
      priority: "high",
    });
  }
  if (categories.has("arms") && log.length >= 2 && !performed.has("high_knee")) {
    suggestions.push({
      exercise: "high_knee",
      label: "High Knees",
      icon: "🏃",
      reason: "Burnout with cardio to elevate heart rate",
      priority: "low",
    });
  }

  const seen = new Set<string>();
  return suggestions
    .filter((s) => {
      if (seen.has(s.exercise)) return false;
      seen.add(s.exercise);
      return true;
    })
    .slice(0, 5);
}

export function getMuscleGroupsSummary(log: GymExerciseLogEntry[]): MuscleGroup[] {
  const set = new Set<MuscleGroup>();
  log.forEach((e) => e.muscleGroups.forEach((m) => set.add(m)));
  return Array.from(set);
}
