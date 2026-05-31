import { PushUpAnalyzer } from "@/lib/pushupAnalyzer";
import { SquatAnalyzer } from "@/lib/squatAnalyzer";
import { PlankAnalyzer } from "@/lib/plankAnalyzer";
import { BicepCurlAnalyzer } from "@/lib/bicepCurlAnalyzer";
import {
  createDeadliftAnalyzer,
  createHighKneeAnalyzer,
  createLateralRaiseAnalyzer,
  createLungeAnalyzer,
  createShoulderPressAnalyzer,
} from "@/lib/configuredAnalyzers";
import {
  getExerciseDef,
  getExerciseIcon,
  getExerciseLabel,
} from "@/lib/exerciseRegistry";
import { GymSessionTracker } from "@/lib/gymSessionTracker";
import { MovementDetector } from "@/lib/movementClassifier";
import { applyHybridAnalysis, summarizeMLSession } from "@/lib/ml/hybridAnalyzer";
import { validateLandmarks } from "@/lib/poseUtils";
import { getTopMistakes } from "@/lib/mistakeLabels";
import { scoreToGrade } from "@/lib/scoringUtils";
import {
  getMuscleGroupsSummary,
  getWorkoutSuggestions,
} from "@/lib/workoutSuggester";
import type {
  AnalyzableExerciseType,
  AnalyzerResult,
  ExerciseStats,
  ExerciseType,
  Grade,
  HybridAnalyzerResult,
  MLAssistMeta,
  MLAssistSessionSummary,
  PoseLandmarks,
  SessionSummaryData,
  WorkoutStatus,
} from "@/types/fitness";

export class MistakeTracker {
  private counts: Record<string, number> = {};

  reset(): void {
    this.counts = {};
  }

  record(issues: string[]): void {
    for (const issue of issues) {
      if (issue === "none") continue;
      this.counts[issue] = (this.counts[issue] ?? 0) + 1;
    }
  }

  getTop(limit = 5) {
    return getTopMistakes(this.counts, limit);
  }
}

export class WorkoutSessionTimer {
  private startedAt: number | null = null;
  private pausedAt: number | null = null;
  private accumulatedPausedMs = 0;
  private status: WorkoutStatus = "idle";

  getStatus(): WorkoutStatus {
    return this.status;
  }

  start(): void {
    this.startedAt = performance.now();
    this.pausedAt = null;
    this.accumulatedPausedMs = 0;
    this.status = "active";
  }

  pause(): void {
    if (this.status !== "active" || this.pausedAt !== null) return;
    this.pausedAt = performance.now();
    this.status = "paused";
  }

  resume(): void {
    if (this.status !== "paused" || this.pausedAt === null) return;
    this.accumulatedPausedMs += performance.now() - this.pausedAt;
    this.pausedAt = null;
    this.status = "active";
  }

  end(): void {
    if (this.status === "paused" && this.pausedAt !== null) {
      this.accumulatedPausedMs += performance.now() - this.pausedAt;
      this.pausedAt = null;
    }
    this.status = "ended";
  }

  reset(): void {
    this.startedAt = null;
    this.pausedAt = null;
    this.accumulatedPausedMs = 0;
    this.status = "idle";
  }

  getDurationSeconds(): number {
    if (this.startedAt === null) return 0;
    const end =
      this.status === "ended" || this.status === "paused"
        ? (this.pausedAt ?? performance.now())
        : performance.now();
    return Math.max(0, Math.floor((end - this.startedAt - this.accumulatedPausedMs) / 1000));
  }
}

type AnalyzerLike = {
  reset(): void;
  getStats(): ExerciseStats;
  analyze(landmarks: PoseLandmarks, timestampMs?: number): AnalyzerResult;
};

export class ExerciseAnalyzerRouter {
  private analyzers: Record<AnalyzableExerciseType, AnalyzerLike>;
  private mode: ExerciseType = "auto_detect";
  private activeExercise: AnalyzableExerciseType = "squat";
  private mistakes = new MistakeTracker();
  private session = new WorkoutSessionTimer();
  private gymSession = new GymSessionTracker();
  private movementDetector = new MovementDetector();
  private mlEnabled = false;
  private mlSessionLog: MLAssistMeta[] = [];

  constructor() {
    this.analyzers = {
      pushup: new PushUpAnalyzer(),
      squat: new SquatAnalyzer(),
      plank: new PlankAnalyzer(),
      bicep_curl: new BicepCurlAnalyzer(),
      lunge: createLungeAnalyzer(),
      shoulder_press: createShoulderPressAnalyzer(),
      lateral_raise: createLateralRaiseAnalyzer(),
      deadlift: createDeadliftAnalyzer(),
      high_knee: createHighKneeAnalyzer(),
    };
  }

  setExercise(exercise: ExerciseType): void {
    if (exercise === this.mode) return;
    this.mode = exercise;
    if (exercise !== "auto_detect") {
      this.activeExercise = exercise;
    }
    this.resetCurrent();
    this.movementDetector.reset();
  }

  getExercise(): ExerciseType {
    return this.mode;
  }

  getActiveExercise(): AnalyzableExerciseType {
    return this.activeExercise;
  }

  isAutoDetect(): boolean {
    return this.mode === "auto_detect";
  }

  getSession() {
    return this.session;
  }

  getGymSession() {
    return this.gymSession;
  }

  getMistakes() {
    return this.mistakes;
  }

  setMLEnabled(enabled: boolean): void {
    this.mlEnabled = enabled;
    if (!enabled) this.mlSessionLog = [];
  }

  isMLEnabled(): boolean {
    return this.mlEnabled;
  }

  getMLSessionSummary(): MLAssistSessionSummary {
    const summary = summarizeMLSession(this.mlSessionLog);
    return {
      used: this.mlEnabled && this.mlSessionLog.length > 0,
      avgConfidence: summary.avgConfidence,
      adjustedFrames: summary.adjustedFrames,
      topMlMistake: summary.topMlMistake,
    };
  }

  getSuggestions() {
    return getWorkoutSuggestions(this.gymSession.getLog(), this.activeExercise);
  }

  startWorkout(): void {
    this.session.start();
    this.gymSession.startBlock(this.activeExercise);
  }

  pauseWorkout(): void {
    this.session.pause();
  }

  resumeWorkout(): void {
    this.session.resume();
  }

  endWorkout(): SessionSummaryData {
    this.gymSession.finalizeCurrentBlock(
      this.getStats(),
      this.session.getDurationSeconds()
    );
    this.session.end();
    return this.buildSummary();
  }

  buildSummary(): SessionSummaryData {
    const stats = this.getStats();
    const grade: Grade = scoreToGrade(stats.formScore);
    const isGymMode = this.mode === "auto_detect";
    const gymLog = this.gymSession.getLog();

    const base = {
      exercise: this.mode,
      exerciseLabel: isGymMode ? "Gym AI Session" : getExerciseLabel(this.activeExercise),
      exerciseIcon: isGymMode ? "🤖" : getExerciseIcon(this.activeExercise),
      durationSeconds: this.session.getDurationSeconds(),
      formScore: stats.formScore,
      grade,
      topMistakes: this.mistakes.getTop(),
      gymLog,
      muscleGroupsTrained: getMuscleGroupsSummary(gymLog),
      suggestions: getWorkoutSuggestions(gymLog, this.activeExercise),
      isGymMode,
      detectedExercise: this.activeExercise,
      mlAssistSummary: this.getMLSessionSummary(),
    };

    if (stats.kind === "plank") {
      return { ...base, totalReps: 0, goodReps: 0, badReps: 0, bestPlankHold: stats.bestHoldTime };
    }
    return {
      ...base,
      totalReps: stats.totalReps,
      goodReps: stats.goodReps,
      badReps: stats.badReps,
      bestPlankHold: 0,
    };
  }

  resetCurrent(): void {
    for (const a of Object.values(this.analyzers)) a.reset();
    this.mistakes.reset();
  }

  resetAll(): void {
    for (const a of Object.values(this.analyzers)) a.reset();
    this.mistakes.reset();
    this.session.reset();
    this.gymSession.reset();
    this.movementDetector.reset();
    this.mlSessionLog = [];
    this.activeExercise =
      this.mode === "auto_detect" ? "squat" : (this.mode as AnalyzableExerciseType);
  }

  getStats(): ExerciseStats {
    return this.analyzers[this.activeExercise].getStats();
  }

  private switchDetectedExercise(next: AnalyzableExerciseType): void {
    if (next === this.activeExercise) return;
    this.gymSession.finalizeCurrentBlock(
      this.getStats(),
      this.session.getDurationSeconds()
    );
    this.analyzers[this.activeExercise].reset();
    this.activeExercise = next;
    this.gymSession.startBlock(next);
  }

  analyze(
    landmarks: PoseLandmarks,
    timestampMs = performance.now()
  ): HybridAnalyzerResult | null {
    if (this.session.getStatus() !== "active") return null;

    let detectionConfidence: number | undefined;

    if (this.mode === "auto_detect") {
      if (!validateLandmarks(landmarks, "auto_detect")) return null;
      const detection = this.movementDetector.detect(landmarks);
      detectionConfidence = detection.confidence;
      this.switchDetectedExercise(detection.exercise);
    } else if (!validateLandmarks(landmarks, this.activeExercise)) {
      return null;
    }

    const analyzer = this.analyzers[this.activeExercise];
    const baseResult =
      this.activeExercise === "plank"
        ? analyzer.analyze(landmarks, timestampMs)
        : analyzer.analyze(landmarks);

    let result: HybridAnalyzerResult = applyHybridAnalysis(
      baseResult,
      landmarks,
      this.activeExercise,
      this.mlEnabled
    );

    this.mistakes.record(result.issues);
    if (result.mlAssist) {
      this.mlSessionLog.push(result.mlAssist);
      if (this.mlSessionLog.length > 500) {
        this.mlSessionLog = this.mlSessionLog.slice(-500);
      }
    }

    if (this.mode === "auto_detect") {
      const def = getExerciseDef(this.activeExercise);
      const prefix = `Detected: ${def.label} — `;
      result = {
        ...result,
        detectedExercise: this.activeExercise,
        detectionConfidence,
        feedback: result.feedback.startsWith("Detected:")
          ? result.feedback
          : `${prefix}${result.feedback}`,
      };
    }

    return result;
  }

  /** Frame analysis for uploaded video (no live session required). */
  analyzeOfflineFrame(
    landmarks: PoseLandmarks,
    timestampMs: number
  ): HybridAnalyzerResult | null {
    if (!validateLandmarks(landmarks, this.activeExercise)) return null;

    const analyzer = this.analyzers[this.activeExercise];
    const baseResult =
      this.activeExercise === "plank"
        ? analyzer.analyze(landmarks, timestampMs)
        : analyzer.analyze(landmarks);

    const result = applyHybridAnalysis(
      baseResult,
      landmarks,
      this.activeExercise,
      this.mlEnabled
    );

    this.mistakes.record(result.issues);
    return result;
  }
}

export function createExerciseAnalyzer(): ExerciseAnalyzerRouter {
  return new ExerciseAnalyzerRouter();
}
