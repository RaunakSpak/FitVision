import {
  averagePoint,
  calculateAngle,
} from "@/lib/poseUtils";
import { buildResult } from "@/lib/analyzerUtils";
import {
  computeAlignmentScore,
  SmartFormScorer,
} from "@/lib/scoringUtils";
import type {
  AnalyzerResult,
  PlankExerciseStats,
  PoseLandmarks,
} from "@/types/fitness";
import { createInitialPlankStats } from "@/types/fitness";

const BODY_ALIGNMENT_MIN = 165;
const BODY_ALIGNMENT_MAX = 195;
const HIP_TOLERANCE = 0.035;
const SHOULDER_ELBOW_TOLERANCE = 0.04;
const PLANK_MIN_ALIGNMENT = 155;

type PlankIssue =
  | "none"
  | "hips_too_high"
  | "hips_too_low"
  | "shoulders_not_aligned"
  | "body_not_straight";

const FEEDBACK: Record<PlankIssue, string> = {
  none: "Great plank",
  hips_too_high: "Lower your hips slightly",
  hips_too_low: "Raise your hips slightly",
  shoulders_not_aligned: "Keep shoulders above elbows",
  body_not_straight: "Keep your body straight",
};

const VIS_KEYS: (keyof PoseLandmarks)[] = [
  "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
  "leftHip", "rightHip", "leftAnkle", "rightAnkle",
];

function avgVisibility(landmarks: PoseLandmarks): number {
  return (
    VIS_KEYS.reduce((acc, k) => acc + (landmarks[k].visibility ?? 0), 0) /
    VIS_KEYS.length
  );
}

export class PlankAnalyzer {
  private stats: PlankExerciseStats = createInitialPlankStats();
  private scorer = new SmartFormScorer();
  private lastTimestampMs = 0;
  private isHolding = false;

  reset(): void {
    this.stats = createInitialPlankStats();
    this.scorer.reset();
    this.lastTimestampMs = 0;
    this.isHolding = false;
  }

  getStats(): PlankExerciseStats {
    return { ...this.stats };
  }

  analyze(landmarks: PoseLandmarks, timestampMs = performance.now()): AnalyzerResult {
    const frame = analyzeFrame(landmarks);

    const goodFormRatio =
      this.stats.duration > 0
        ? Math.max(
            0,
            (this.stats.duration - this.stats.badFormSeconds) / this.stats.duration
          )
        : undefined;

    this.stats.formScore = this.scorer.update({
      issues: frame.issues,
      visibilityScore: avgVisibility(landmarks),
      rangeOfMotionScore: computeAlignmentScore(frame.bodyAlignmentAngle),
      alignmentScore: computeAlignmentScore(frame.bodyAlignmentAngle),
      repQualityRatio: goodFormRatio,
    });

    const deltaSec = this.lastTimestampMs
      ? (timestampMs - this.lastTimestampMs) / 1000
      : 0;
    this.lastTimestampMs = timestampMs;

    const inPlankPose = frame.bodyAlignmentAngle >= PLANK_MIN_ALIGNMENT;

    if (inPlankPose && frame.isGoodForm) {
      this.isHolding = true;
      this.stats.currentPhase = "HOLD";
      this.stats.duration += deltaSec;
      if (this.stats.duration > this.stats.bestHoldTime) {
        this.stats.bestHoldTime = this.stats.duration;
      }
    } else if (inPlankPose && !frame.isGoodForm) {
      this.isHolding = true;
      this.stats.currentPhase = "HOLD";
      this.stats.duration += deltaSec;
      this.stats.badFormSeconds += deltaSec;
    } else {
      this.isHolding = false;
      this.stats.currentPhase = "REST";
    }

    const primary = frame.issues.find((i) => i !== "none") as PlankIssue | undefined;

    return buildResult(
      primary ? FEEDBACK[primary] : "Great plank",
      frame.isGoodForm,
      this.stats.currentPhase,
      this.stats.formScore,
      {
        bodyAlignmentAngle: frame.bodyAlignmentAngle,
        duration: this.stats.duration,
        bestHoldTime: this.stats.bestHoldTime,
        badFormSeconds: this.stats.badFormSeconds,
      },
      frame.issues,
      false
    );
  }
}

function analyzeFrame(landmarks: PoseLandmarks) {
  const shoulder = averagePoint(landmarks.leftShoulder, landmarks.rightShoulder);
  const hip = averagePoint(landmarks.leftHip, landmarks.rightHip);
  const ankle = averagePoint(landmarks.leftAnkle, landmarks.rightAnkle);
  const elbow = averagePoint(landmarks.leftElbow, landmarks.rightElbow);

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

  const issues = detectIssues(shoulder, hip, ankle, elbow, bodyAlignmentAngle);
  const isGoodForm = issues.every((i) => i === "none");

  return { bodyAlignmentAngle, issues, isGoodForm };
}

function detectIssues(
  shoulder: { x: number; y: number },
  hip: { x: number; y: number },
  ankle: { x: number; y: number },
  elbow: { x: number; y: number },
  bodyAlignmentAngle: number
): PlankIssue[] {
  const issues: PlankIssue[] = [];

  if (bodyAlignmentAngle < BODY_ALIGNMENT_MIN) {
    issues.push("body_not_straight");
  }

  const expectedHipY = shoulder.y + (ankle.y - shoulder.y) * 0.55;
  const hipDelta = hip.y - expectedHipY;
  if (hipDelta < -HIP_TOLERANCE) issues.push("hips_too_high");
  else if (hipDelta > HIP_TOLERANCE) issues.push("hips_too_low");

  if (shoulder.y > elbow.y + SHOULDER_ELBOW_TOLERANCE) {
    issues.push("shoulders_not_aligned");
  }

  if (
    bodyAlignmentAngle < BODY_ALIGNMENT_MIN ||
    bodyAlignmentAngle > BODY_ALIGNMENT_MAX
  ) {
    if (!issues.includes("body_not_straight")) {
      issues.push("body_not_straight");
    }
  }

  return issues.length ? issues : ["none"];
}
