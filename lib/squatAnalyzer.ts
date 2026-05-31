import {
  averagePoint,
  calculateAngle,
  calculateVerticalLean,
} from "@/lib/poseUtils";
import {
  accumulateIssues,
  buildResult,
  resolveRepFeedback,
} from "@/lib/analyzerUtils";
import {
  computeRangeOfMotionScore,
  SmartFormScorer,
} from "@/lib/scoringUtils";
import type {
  AnalyzerResult,
  PoseLandmarks,
  RepExerciseStats,
  RepResult,
} from "@/types/fitness";
import { createInitialRepStats } from "@/types/fitness";

const STANDING_ANGLE = 160;
const DOWN_ANGLE = 100;
const KNEE_COLLAPSE_THRESHOLD = 0.03;
const TORSO_LEAN_MAX = 35;
const HEEL_LIFT_THRESHOLD = 0.025;

type SquatIssue =
  | "none"
  | "not_deep_enough"
  | "knees_collapse"
  | "torso_lean"
  | "heels_lifted"
  | "shallow_movement"
  | "not_standing_full";

const FEEDBACK: Record<SquatIssue, string> = {
  none: "Great form",
  not_deep_enough: "Go deeper",
  knees_collapse: "Keep your knees aligned",
  torso_lean: "Keep chest up",
  heels_lifted: "Keep heels on the ground",
  shallow_movement: "Go deeper",
  not_standing_full: "Stand fully at the top",
};

const VIS_KEYS: (keyof PoseLandmarks)[] = [
  "leftShoulder", "rightShoulder", "leftHip", "rightHip",
  "leftKnee", "rightKnee", "leftAnkle", "rightAnkle",
];

function avgVisibility(landmarks: PoseLandmarks): number {
  return (
    VIS_KEYS.reduce((acc, k) => acc + (landmarks[k].visibility ?? 0), 0) /
    VIS_KEYS.length
  );
}

export class SquatAnalyzer {
  private phase: "STANDING" | "DOWN" | "TRANSITION" = "STANDING";
  private repInProgress = false;
  private downPhaseIssues: string[] = [];
  private stats: RepExerciseStats = createInitialRepStats();
  private scorer = new SmartFormScorer();

  reset(): void {
    this.phase = "STANDING";
    this.repInProgress = false;
    this.downPhaseIssues = [];
    this.stats = createInitialRepStats();
    this.stats.currentPhase = "STANDING";
    this.scorer.reset();
  }

  getStats(): RepExerciseStats {
    return { ...this.stats };
  }

  analyze(landmarks: PoseLandmarks): AnalyzerResult {
    const frame = analyzeFrame(landmarks);
    this.stats.currentPhase = frame.phase;

    const repQuality =
      this.stats.totalReps > 0
        ? this.stats.goodReps / this.stats.totalReps
        : undefined;

    this.stats.formScore = this.scorer.update({
      issues: frame.issues,
      visibilityScore: avgVisibility(landmarks),
      rangeOfMotionScore: computeRangeOfMotionScore(
        frame.kneeAngle,
        DOWN_ANGLE,
        STANDING_ANGLE
      ),
      alignmentScore: Math.max(0, 100 - frame.torsoLean * 2),
      repQualityRatio: repQuality,
    });

    const repResult = this.updateRepState(frame.phase, frame.issues);
    if (repResult) this.applyRep(repResult);

    const primary = frame.issues.find((i) => i !== "none") as SquatIssue | undefined;
    const { feedback, repCompleted } = resolveRepFeedback(
      primary ? FEEDBACK[primary] : "Great form",
      frame.isGoodForm,
      repResult,
      "Good squat counted",
      FEEDBACK
    );

    return buildResult(
      feedback,
      frame.isGoodForm,
      frame.phase,
      this.stats.formScore,
      {
        kneeAngle: frame.kneeAngle,
        hipAngle: frame.hipAngle,
        torsoLean: frame.torsoLean,
      },
      frame.issues,
      repCompleted
    );
  }

  private updateRepState(
    phase: "STANDING" | "DOWN" | "TRANSITION",
    issues: string[]
  ): RepResult | null {
    const prev = this.phase;

    if (phase === "DOWN" && prev !== "DOWN") {
      this.repInProgress = true;
      this.downPhaseIssues = [...issues];
    } else if (phase === "DOWN" && this.repInProgress) {
      this.downPhaseIssues = accumulateIssues(this.downPhaseIssues, issues);
    }

    if (phase === "STANDING" && prev === "DOWN" && this.repInProgress) {
      this.repInProgress = false;
      const active = this.downPhaseIssues.filter((i) => i !== "none");
      this.phase = phase;
      this.downPhaseIssues = [];
      return { isValid: true, isGoodForm: active.length === 0, issues: active };
    }

    this.phase = phase;
    return null;
  }

  private applyRep(result: RepResult): void {
    this.stats.totalReps += 1;
    if (result.isGoodForm) this.stats.goodReps += 1;
    else this.stats.badReps += 1;
  }
}

function analyzeFrame(landmarks: PoseLandmarks) {
  const shoulder = averagePoint(landmarks.leftShoulder, landmarks.rightShoulder);
  const hip = averagePoint(landmarks.leftHip, landmarks.rightHip);

  const leftKnee = calculateAngle(
    landmarks.leftHip,
    landmarks.leftKnee,
    landmarks.leftAnkle
  );
  const rightKnee = calculateAngle(
    landmarks.rightHip,
    landmarks.rightKnee,
    landmarks.rightAnkle
  );
  const kneeAngle = (leftKnee + rightKnee) / 2;

  const leftHipAngle = calculateAngle(
    landmarks.leftShoulder,
    landmarks.leftHip,
    landmarks.leftKnee
  );
  const rightHipAngle = calculateAngle(
    landmarks.rightShoulder,
    landmarks.rightHip,
    landmarks.rightKnee
  );
  const hipAngle = (leftHipAngle + rightHipAngle) / 2;
  const torsoLean = calculateVerticalLean(shoulder, hip);

  let phase: "STANDING" | "DOWN" | "TRANSITION" = "TRANSITION";
  if (kneeAngle > STANDING_ANGLE) phase = "STANDING";
  else if (kneeAngle < DOWN_ANGLE) phase = "DOWN";

  const issues = detectIssues(landmarks, kneeAngle, torsoLean, phase);
  const isGoodForm = issues.every((i) => i === "none");

  return { kneeAngle, hipAngle, torsoLean, phase, issues, isGoodForm };
}

function detectIssues(
  landmarks: PoseLandmarks,
  kneeAngle: number,
  torsoLean: number,
  phase: "STANDING" | "DOWN" | "TRANSITION"
): SquatIssue[] {
  const issues: SquatIssue[] = [];

  const leftCollapse =
    landmarks.leftKnee.x - landmarks.leftAnkle.x > KNEE_COLLAPSE_THRESHOLD;
  const rightCollapse =
    landmarks.rightAnkle.x - landmarks.rightKnee.x > KNEE_COLLAPSE_THRESHOLD;
  if (leftCollapse || rightCollapse) issues.push("knees_collapse");

  if (torsoLean > TORSO_LEAN_MAX) issues.push("torso_lean");

  if (phase === "DOWN") {
    const leftHeelLift =
      landmarks.leftAnkle.y < landmarks.leftKnee.y - HEEL_LIFT_THRESHOLD;
    const rightHeelLift =
      landmarks.rightAnkle.y < landmarks.rightKnee.y - HEEL_LIFT_THRESHOLD;
    if (leftHeelLift || rightHeelLift) issues.push("heels_lifted");
    if (kneeAngle > DOWN_ANGLE + 20) issues.push("not_deep_enough");
  }

  if (
    phase === "TRANSITION" &&
    kneeAngle > DOWN_ANGLE + 30 &&
    kneeAngle < STANDING_ANGLE - 20
  ) {
    issues.push("shallow_movement");
  }

  if (phase === "STANDING" && kneeAngle < STANDING_ANGLE - 10) {
    issues.push("not_standing_full");
  }

  return issues.length ? issues : ["none"];
}
