import {
  averagePoint,
  calculateAngle,
} from "@/lib/poseUtils";
import {
  accumulateIssues,
  buildResult,
  resolveRepFeedback,
} from "@/lib/analyzerUtils";
import {
  computeAlignmentScore,
  computeRangeOfMotionScore,
  SmartFormScorer,
} from "@/lib/scoringUtils";
import type {
  AnalyzerResult,
  Point2D,
  PoseLandmarks,
  RepExerciseStats,
  RepResult,
} from "@/types/fitness";
import { createInitialRepStats } from "@/types/fitness";

const UP_ANGLE = 150;
const DOWN_ANGLE = 90;
const BODY_ALIGNMENT_MIN = 160;
const BODY_ALIGNMENT_MAX = 195;
const HIP_HEIGHT_TOLERANCE = 0.04;

type PushUpIssue =
  | "none"
  | "poor_alignment"
  | "hips_too_high"
  | "hips_too_low"
  | "elbow_not_low_enough"
  | "body_not_straight";

const FEEDBACK: Record<PushUpIssue, string> = {
  none: "Great form",
  poor_alignment: "Keep your hips aligned",
  hips_too_high: "Don't drop your hips",
  hips_too_low: "Lower your hips — avoid piking",
  elbow_not_low_enough: "Lower your chest more",
  body_not_straight: "Straighten your body line",
};

const VIS_KEYS: (keyof PoseLandmarks)[] = [
  "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
  "leftWrist", "rightWrist", "leftHip", "rightHip",
  "leftKnee", "rightKnee", "leftAnkle", "rightAnkle",
];

function avgVisibility(landmarks: PoseLandmarks): number {
  const sum = VIS_KEYS.reduce(
    (acc, k) => acc + (landmarks[k].visibility ?? 0),
    0
  );
  return sum / VIS_KEYS.length;
}

export class PushUpAnalyzer {
  private phase: "UP" | "DOWN" | "TRANSITION" = "UP";
  private repInProgress = false;
  private downPhaseIssues: string[] = [];
  private stats: RepExerciseStats = createInitialRepStats();
  private scorer = new SmartFormScorer();

  reset(): void {
    this.phase = "UP";
    this.repInProgress = false;
    this.downPhaseIssues = [];
    this.stats = createInitialRepStats();
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
        frame.elbowAngle,
        DOWN_ANGLE,
        UP_ANGLE
      ),
      alignmentScore: computeAlignmentScore(frame.bodyAlignmentAngle),
      repQualityRatio: repQuality,
    });

    const repResult = this.updateRepState(frame.phase, frame.issues);
    if (repResult) this.applyRep(repResult);

    const { feedback, repCompleted } = resolveRepFeedback(
      frame.issues.find((i) => i !== "none")
        ? FEEDBACK[frame.issues.find((i) => i !== "none") as PushUpIssue]
        : "Great form",
      frame.isGoodForm,
      repResult,
      "Good rep counted",
      FEEDBACK
    );

    return buildResult(
      feedback,
      frame.isGoodForm,
      frame.phase,
      this.stats.formScore,
      {
        primaryAngle: frame.elbowAngle,
        bodyAlignmentAngle: frame.bodyAlignmentAngle,
      },
      frame.issues,
      repCompleted
    );
  }

  private updateRepState(
    phase: "UP" | "DOWN" | "TRANSITION",
    issues: string[]
  ): RepResult | null {
    const prev = this.phase;

    if (phase === "DOWN" && prev !== "DOWN") {
      this.repInProgress = true;
      this.downPhaseIssues = [...issues];
    } else if (phase === "DOWN" && this.repInProgress) {
      this.downPhaseIssues = accumulateIssues(this.downPhaseIssues, issues);
    }

    if (phase === "UP" && prev === "DOWN" && this.repInProgress) {
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
  const ankle = averagePoint(landmarks.leftAnkle, landmarks.rightAnkle);

  const leftElbow = calculateAngle(
    landmarks.leftShoulder,
    landmarks.leftElbow,
    landmarks.leftWrist
  );
  const rightElbow = calculateAngle(
    landmarks.rightShoulder,
    landmarks.rightElbow,
    landmarks.rightWrist
  );
  const elbowAngle = (leftElbow + rightElbow) / 2;

  const leftBody = calculateAngle(
    landmarks.leftShoulder,
    landmarks.leftHip,
    landmarks.leftAnkle
  );
  const rightBody = calculateAngle(
    landmarks.rightShoulder,
    landmarks.rightHip,
    landmarks.rightAnkle
  );
  const bodyAlignmentAngle = (leftBody + rightBody) / 2;

  let phase: "UP" | "DOWN" | "TRANSITION" = "TRANSITION";
  if (elbowAngle > UP_ANGLE) phase = "UP";
  else if (elbowAngle < DOWN_ANGLE) phase = "DOWN";

  const issues = detectIssues(
    shoulder,
    hip,
    ankle,
    elbowAngle,
    bodyAlignmentAngle,
    phase
  );
  const isGoodForm = issues.every((i) => i === "none");

  return { elbowAngle, bodyAlignmentAngle, phase, issues, isGoodForm };
}

function detectIssues(
  shoulder: Point2D,
  hip: Point2D,
  ankle: Point2D,
  elbowAngle: number,
  bodyAlignmentAngle: number,
  phase: "UP" | "DOWN" | "TRANSITION"
): PushUpIssue[] {
  const issues: PushUpIssue[] = [];

  if (bodyAlignmentAngle < BODY_ALIGNMENT_MIN) {
    issues.push("body_not_straight");
  }
  if (
    bodyAlignmentAngle < BODY_ALIGNMENT_MIN ||
    bodyAlignmentAngle > BODY_ALIGNMENT_MAX
  ) {
    issues.push("poor_alignment");
  }

  const expectedHipY = shoulder.y + (ankle.y - shoulder.y) * 0.55;
  const hipDelta = hip.y - expectedHipY;
  if (hipDelta < -HIP_HEIGHT_TOLERANCE) issues.push("hips_too_high");
  else if (hipDelta > HIP_HEIGHT_TOLERANCE) issues.push("hips_too_low");

  if (phase === "DOWN" && elbowAngle > DOWN_ANGLE + 15) {
    issues.push("elbow_not_low_enough");
  }

  return issues.length ? issues : ["none"];
}
