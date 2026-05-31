import {
  calculateAngle,
  calculateDistance,
  isLandmarkVisible,
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

const EXTENDED_ANGLE = 150;
const CURL_ANGLE = 60;
const ELBOW_DRIFT_THRESHOLD = 0.06;
const WRIST_STABILITY_THRESHOLD = 0.04;

type CurlIssue =
  | "none"
  | "incomplete_curl"
  | "incomplete_rep"
  | "elbow_unstable"
  | "not_fully_extended"
  | "wrist_unstable";

const FEEDBACK: Record<CurlIssue, string> = {
  none: "Great form",
  incomplete_curl: "Curl higher",
  incomplete_rep: "Curl higher",
  elbow_unstable: "Keep elbow stable",
  not_fully_extended: "Fully extend your arm",
  wrist_unstable: "Control the movement",
};

interface ArmMetrics {
  elbowAngle: number;
  shoulderElbowDist: number;
  wristY: number;
  visible: boolean;
}

const VIS_KEYS: (keyof PoseLandmarks)[] = [
  "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
  "leftWrist", "rightWrist",
];

function avgVisibility(landmarks: PoseLandmarks): number {
  return (
    VIS_KEYS.reduce((acc, k) => acc + (landmarks[k].visibility ?? 0), 0) /
    VIS_KEYS.length
  );
}

export class BicepCurlAnalyzer {
  private phase: "EXTENDED" | "CURL" | "TRANSITION" = "EXTENDED";
  private repInProgress = false;
  private curlPhaseIssues: string[] = [];
  private stats: RepExerciseStats = createInitialRepStats();
  private scorer = new SmartFormScorer();
  private baselineElbowDist: number | null = null;
  private prevWristY: number | null = null;

  reset(): void {
    this.phase = "EXTENDED";
    this.repInProgress = false;
    this.curlPhaseIssues = [];
    this.stats = createInitialRepStats();
    this.stats.currentPhase = "EXTENDED";
    this.scorer.reset();
    this.baselineElbowDist = null;
    this.prevWristY = null;
  }

  getStats(): RepExerciseStats {
    return { ...this.stats };
  }

  analyze(landmarks: PoseLandmarks): AnalyzerResult {
    const frame = analyzeFrame(landmarks, this.baselineElbowDist, this.prevWristY);

    if (frame.activeArm.shoulderElbowDist > 0) {
      if (this.baselineElbowDist === null) {
        this.baselineElbowDist = frame.activeArm.shoulderElbowDist;
      }
      this.prevWristY = frame.activeArm.wristY;
    }

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
        CURL_ANGLE,
        EXTENDED_ANGLE
      ),
      alignmentScore: frame.activeArm.visible ? 90 : 50,
      repQualityRatio: repQuality,
    });

    const repResult = this.updateRepState(frame.phase, frame.issues);
    if (repResult) this.applyRep(repResult);

    const primary = frame.issues.find((i) => i !== "none") as CurlIssue | undefined;
    const { feedback, repCompleted } = resolveRepFeedback(
      primary ? FEEDBACK[primary] : "Great form",
      frame.isGoodForm,
      repResult,
      "Good curl counted",
      FEEDBACK
    );

    return buildResult(
      feedback,
      frame.isGoodForm,
      frame.phase,
      this.stats.formScore,
      { primaryAngle: frame.elbowAngle },
      frame.issues,
      repCompleted
    );
  }

  private updateRepState(
    phase: "EXTENDED" | "CURL" | "TRANSITION",
    issues: string[]
  ): RepResult | null {
    const prev = this.phase;

    if (phase === "CURL" && prev !== "CURL") {
      this.repInProgress = true;
      this.curlPhaseIssues = [...issues];
    } else if (phase === "CURL" && this.repInProgress) {
      this.curlPhaseIssues = accumulateIssues(this.curlPhaseIssues, issues);
    }

    if (phase === "EXTENDED" && prev === "CURL" && this.repInProgress) {
      this.repInProgress = false;
      const active = this.curlPhaseIssues.filter((i) => i !== "none");
      this.phase = phase;
      this.curlPhaseIssues = [];
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

function getArmMetrics(landmarks: PoseLandmarks, side: "left" | "right"): ArmMetrics {
  const shoulder = side === "left" ? landmarks.leftShoulder : landmarks.rightShoulder;
  const elbow = side === "left" ? landmarks.leftElbow : landmarks.rightElbow;
  const wrist = side === "left" ? landmarks.leftWrist : landmarks.rightWrist;

  const visible =
    isLandmarkVisible(shoulder) &&
    isLandmarkVisible(elbow) &&
    isLandmarkVisible(wrist);

  if (!visible) {
    return { elbowAngle: 0, shoulderElbowDist: 0, wristY: 0, visible: false };
  }

  return {
    elbowAngle: calculateAngle(shoulder, elbow, wrist),
    shoulderElbowDist: calculateDistance(shoulder, elbow),
    wristY: wrist.y,
    visible: true,
  };
}

function analyzeFrame(
  landmarks: PoseLandmarks,
  baselineElbowDist: number | null,
  prevWristY: number | null
) {
  const left = getArmMetrics(landmarks, "left");
  const right = getArmMetrics(landmarks, "right");
  const activeArm =
    left.visible && right.visible
      ? left.elbowAngle < right.elbowAngle
        ? left
        : right
      : left.visible
        ? left
        : right;

  const elbowAngle = activeArm.elbowAngle;

  let phase: "EXTENDED" | "CURL" | "TRANSITION" = "TRANSITION";
  if (elbowAngle > EXTENDED_ANGLE) phase = "EXTENDED";
  else if (elbowAngle < CURL_ANGLE) phase = "CURL";

  const issues = detectIssues(activeArm, baselineElbowDist, prevWristY, phase);
  const isGoodForm = issues.every((i) => i === "none");

  return { elbowAngle, phase, issues, isGoodForm, activeArm };
}

function detectIssues(
  arm: ArmMetrics,
  baselineElbowDist: number | null,
  prevWristY: number | null,
  phase: "EXTENDED" | "CURL" | "TRANSITION"
): CurlIssue[] {
  const issues: CurlIssue[] = [];

  if (!arm.visible) return ["none"];

  if (baselineElbowDist !== null) {
    const drift = Math.abs(arm.shoulderElbowDist - baselineElbowDist);
    if (drift > ELBOW_DRIFT_THRESHOLD) issues.push("elbow_unstable");
  }

  if (phase === "CURL" && arm.elbowAngle > CURL_ANGLE + 20) {
    issues.push("incomplete_curl");
    issues.push("incomplete_rep");
  }

  if (phase === "EXTENDED" && arm.elbowAngle < EXTENDED_ANGLE - 15) {
    issues.push("not_fully_extended");
  }

  if (prevWristY !== null) {
    const wristJitter = Math.abs(arm.wristY - prevWristY);
    if (wristJitter > WRIST_STABILITY_THRESHOLD && phase === "TRANSITION") {
      issues.push("wrist_unstable");
    }
  }

  return issues.length ? issues : ["none"];
}
