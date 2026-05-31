export type AnalyzableExerciseType =
  | "pushup"
  | "squat"
  | "plank"
  | "bicep_curl"
  | "lunge"
  | "shoulder_press"
  | "lateral_raise"
  | "deadlift"
  | "high_knee";

export type ExerciseType = AnalyzableExerciseType | "auto_detect";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "core"
  | "forearms"
  | "cardio";

export type ExercisePhase =
  | "UP"
  | "DOWN"
  | "STANDING"
  | "TRANSITION"
  | "HOLD"
  | "EXTENDED"
  | "CURL";

export interface Point2D {
  x: number;
  y: number;
  visibility?: number;
}

export interface PoseLandmarks {
  leftShoulder: Point2D;
  rightShoulder: Point2D;
  leftElbow: Point2D;
  rightElbow: Point2D;
  leftWrist: Point2D;
  rightWrist: Point2D;
  leftHip: Point2D;
  rightHip: Point2D;
  leftKnee: Point2D;
  rightKnee: Point2D;
  leftAnkle: Point2D;
  rightAnkle: Point2D;
}

export interface AnalyzerMetrics {
  primaryAngle?: number;
  secondaryAngle?: number;
  bodyAlignmentAngle?: number;
  kneeAngle?: number;
  hipAngle?: number;
  torsoLean?: number;
  duration?: number;
  bestHoldTime?: number;
  badFormSeconds?: number;
}

export interface AnalyzerResult {
  feedback: string;
  isGoodForm: boolean;
  phase: ExercisePhase | string;
  formScore: number;
  metrics: AnalyzerMetrics;
  issues: string[];
  repCompleted?: boolean;
  detectedExercise?: AnalyzableExerciseType;
  detectionConfidence?: number;
}

export type FormLabel = "good_form" | "bad_form";

export type MLMistakeType =
  | "hips_too_low"
  | "hips_too_high"
  | "not_deep_enough"
  | "elbow_unstable"
  | "torso_lean"
  | "incomplete_rep"
  | "body_not_straight"
  | "none";

export interface ClassifierPrediction {
  label: FormLabel;
  confidence: number;
  predictedMistake: MLMistakeType | null;
  scoreAdjustment: number;
}

export interface MLAssistMeta {
  enabled: boolean;
  prediction: ClassifierPrediction;
  featureCount: number;
  explanation: string;
}

export interface HybridAnalyzerResult extends AnalyzerResult {
  mlAssist?: MLAssistMeta;
}

export interface MLAssistSessionSummary {
  used: boolean;
  avgConfidence: number;
  adjustedFrames: number;
  topMlMistake: string | null;
}

export interface DatasetSample {
  id: string;
  exercise: AnalyzableExerciseType;
  formLabel: FormLabel;
  mistakeType: MLMistakeType;
  features: number[];
  featureNames: string[];
  timestamp: number;
}

export type WorkoutStatus = "idle" | "active" | "paused" | "ended";

export type Grade = "A" | "B" | "C" | "D";

export interface WorkoutSuggestion {
  exercise: AnalyzableExerciseType;
  label: string;
  icon: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface GymExerciseLogEntry {
  exercise: AnalyzableExerciseType;
  label: string;
  icon: string;
  reps: number;
  goodReps: number;
  durationSeconds: number;
  muscleGroups: MuscleGroup[];
}

export interface SessionSummaryData {
  exercise: ExerciseType;
  exerciseLabel: string;
  exerciseIcon: string;
  durationSeconds: number;
  formScore: number;
  grade: Grade;
  totalReps: number;
  goodReps: number;
  badReps: number;
  bestPlankHold: number;
  topMistakes: { id: string; label: string; count: number }[];
  gymLog: GymExerciseLogEntry[];
  muscleGroupsTrained: MuscleGroup[];
  suggestions: WorkoutSuggestion[];
  isGymMode: boolean;
  detectedExercise?: AnalyzableExerciseType;
  mlAssistSummary?: MLAssistSessionSummary;
}

export interface VideoTimelineEntry {
  timeSeconds: number;
  feedback: string;
  formScore: number;
  isGoodForm: boolean;
}

export interface VideoFrameSnapshot {
  timeSeconds: number;
  formScore: number;
  imageDataUrl: string;
}

export interface VideoAnalysisReport {
  exercise: AnalyzableExerciseType;
  exerciseLabel: string;
  exerciseIcon: string;
  durationSeconds: number;
  formScore: number;
  grade: Grade;
  totalReps: number;
  goodReps: number;
  badReps: number;
  bestPlankHold: number;
  topMistakes: { id: string; label: string; count: number }[];
  mistakeFrequency: { id: string; label: string; count: number }[];
  timeline: VideoTimelineEntry[];
  bestFrame: VideoFrameSnapshot | null;
  worstFrame: VideoFrameSnapshot | null;
  framesAnalyzed: number;
  framesWithPose: number;
  mlAssistSummary?: MLAssistSessionSummary;
}

export type VideoAnalysisStatus =
  | "idle"
  | "loading_model"
  | "analyzing"
  | "complete"
  | "error";

export interface RepExerciseStats {
  kind: "reps";
  totalReps: number;
  goodReps: number;
  badReps: number;
  currentPhase: ExercisePhase | string;
  formScore: number;
}

export interface PlankExerciseStats {
  kind: "plank";
  duration: number;
  bestHoldTime: number;
  formScore: number;
  badFormSeconds: number;
  currentPhase: "HOLD" | "REST";
}

export type ExerciseStats = RepExerciseStats | PlankExerciseStats;

export interface RepResult {
  isValid: boolean;
  isGoodForm: boolean;
  issues: string[];
}

export interface ExerciseInfo {
  id: ExerciseType;
  label: string;
  icon: string;
  description: string;
  color: "cyan" | "green" | "pink" | "purple";
}

// Re-export catalog from registry for backward compatibility
export {
  EXERCISE_CATALOG,
  AUTO_DETECT_OPTION,
  ALL_SELECTOR_OPTIONS,
} from "@/lib/exerciseRegistry";

export function createInitialRepStats(): RepExerciseStats {
  return {
    kind: "reps",
    totalReps: 0,
    goodReps: 0,
    badReps: 0,
    currentPhase: "UP",
    formScore: 100,
  };
}

export function createInitialPlankStats(): PlankExerciseStats {
  return {
    kind: "plank",
    duration: 0,
    bestHoldTime: 0,
    formScore: 100,
    badFormSeconds: 0,
    currentPhase: "REST",
  };
}

export function getExerciseStartMessage(exercise: ExerciseType): string {
  switch (exercise) {
    case "auto_detect":
      return "Gym AI mode — perform any exercise";
    case "pushup":
      return "Get into push-up position";
    case "squat":
      return "Stand facing the camera, feet shoulder-width";
    case "lunge":
      return "Step forward into a lunge";
    case "deadlift":
      return "Hinge at the hips — keep back flat";
    case "plank":
      return "Hold a plank — keep your body straight";
    case "shoulder_press":
      return "Press overhead — core tight";
    case "lateral_raise":
      return "Raise arms to shoulder height";
    case "bicep_curl":
      return "Show your upper body — arm at your side";
    case "high_knee":
      return "Drive knees up — stay tall";
  }
}

export function isPlankExercise(exercise: AnalyzableExerciseType): boolean {
  return exercise === "plank";
}

export function initialStatsFor(exercise: ExerciseType): ExerciseStats {
  if (exercise === "plank") return createInitialPlankStats();
  return createInitialRepStats();
}
