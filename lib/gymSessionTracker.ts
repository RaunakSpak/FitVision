import { getExerciseDef } from "@/lib/exerciseRegistry";
import type { AnalyzableExerciseType, ExerciseStats, GymExerciseLogEntry, MuscleGroup } from "@/types/fitness";

export type { GymExerciseLogEntry };

export class GymSessionTracker {
  private log: GymExerciseLogEntry[] = [];
  private currentBlock: AnalyzableExerciseType | null = null;
  private blockStartMs: number | null = null;

  reset(): void {
    this.log = [];
    this.currentBlock = null;
    this.blockStartMs = null;
  }

  getLog(): GymExerciseLogEntry[] {
    return [...this.log];
  }

  /** Call when auto-detect switches exercise or workout ends */
  snapshotBlock(
    exercise: AnalyzableExerciseType,
    stats: ExerciseStats,
    sessionDurationSec: number
  ): void {
    const def = getExerciseDef(exercise);
    const blockDuration =
      this.blockStartMs !== null
        ? Math.floor((performance.now() - this.blockStartMs) / 1000)
        : sessionDurationSec;

    const entry: GymExerciseLogEntry = {
      exercise,
      label: def.label,
      icon: def.icon,
      muscleGroups: def.muscleGroups,
      reps: stats.kind === "reps" ? stats.totalReps : 0,
      goodReps: stats.kind === "reps" ? stats.goodReps : 0,
      durationSeconds:
        stats.kind === "plank"
          ? Math.floor(stats.duration)
          : Math.max(blockDuration, 1),
    };

    const existing = this.log.findIndex((e) => e.exercise === exercise);
    if (existing >= 0) {
      const prev = this.log[existing];
      this.log[existing] = {
        ...entry,
        reps: prev.reps + entry.reps,
        goodReps: prev.goodReps + entry.goodReps,
        durationSeconds: prev.durationSeconds + entry.durationSeconds,
      };
    } else {
      this.log.push(entry);
    }
  }

  startBlock(exercise: AnalyzableExerciseType): void {
    if (this.currentBlock === exercise) return;
    this.currentBlock = exercise;
    this.blockStartMs = performance.now();
  }

  finalizeCurrentBlock(stats: ExerciseStats, durationSec: number): void {
    if (!this.currentBlock) return;
    this.snapshotBlock(this.currentBlock, stats, durationSec);
    this.currentBlock = null;
    this.blockStartMs = null;
  }
}

export function formatMuscleGroups(groups: MuscleGroup[]): string {
  const labels: Record<MuscleGroup, string> = {
    chest: "Chest",
    back: "Back",
    shoulders: "Shoulders",
    biceps: "Biceps",
    triceps: "Triceps",
    quads: "Quads",
    hamstrings: "Hamstrings",
    glutes: "Glutes",
    core: "Core",
    forearms: "Forearms",
    cardio: "Cardio",
  };
  return groups.map((g) => labels[g] ?? g).join(", ");
}
