import {
  getExerciseLabel,
} from "@/lib/exerciseRegistry";
import {
  averagePoint,
  calculateAngle,
  calculateVerticalLean,
} from "@/lib/poseUtils";
import type { AnalyzableExerciseType, PoseLandmarks } from "@/types/fitness";

export interface MovementFeatures {
  kneeAngle: number;
  leftKneeAngle: number;
  rightKneeAngle: number;
  elbowAngle: number;
  bodyAlignment: number;
  torsoLean: number;
  wristAboveShoulder: boolean;
  wristSpread: number;
  hipBelowShoulder: boolean;
  isHorizontal: boolean;
  kneeAsymmetry: number;
  avgKneeY: number;
  avgHipY: number;
}

export interface ClassificationResult {
  exercise: AnalyzableExerciseType;
  confidence: number;
  label: string;
  scores: Partial<Record<AnalyzableExerciseType, number>>;
}

function extractFeatures(landmarks: PoseLandmarks): MovementFeatures {
  const shoulder = averagePoint(landmarks.leftShoulder, landmarks.rightShoulder);
  const hip = averagePoint(landmarks.leftHip, landmarks.rightHip);

  const leftKneeAngle = calculateAngle(
    landmarks.leftHip,
    landmarks.leftKnee,
    landmarks.leftAnkle
  );
  const rightKneeAngle = calculateAngle(
    landmarks.rightHip,
    landmarks.rightKnee,
    landmarks.rightAnkle
  );
  const kneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  const leftElbowAngle = calculateAngle(
    landmarks.leftShoulder,
    landmarks.leftElbow,
    landmarks.leftWrist
  );
  const rightElbowAngle = calculateAngle(
    landmarks.rightShoulder,
    landmarks.rightElbow,
    landmarks.rightWrist
  );
  const elbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

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
  const bodyAlignment = (leftBody + rightBody) / 2;

  const torsoLean = calculateVerticalLean(shoulder, hip);
  const wristMid = averagePoint(landmarks.leftWrist, landmarks.rightWrist);

  return {
    kneeAngle,
    leftKneeAngle,
    rightKneeAngle,
    elbowAngle,
    bodyAlignment,
    torsoLean,
    wristAboveShoulder:
      wristMid.y < shoulder.y - 0.05 &&
      (landmarks.leftWrist.y < landmarks.leftShoulder.y - 0.04 ||
        landmarks.rightWrist.y < landmarks.rightShoulder.y - 0.04),
    wristSpread: Math.abs(landmarks.leftWrist.x - landmarks.rightWrist.x),
    hipBelowShoulder: hip.y > shoulder.y + 0.05,
    isHorizontal: bodyAlignment > 140 && torsoLean > 50,
    kneeAsymmetry: Math.abs(leftKneeAngle - rightKneeAngle),
    avgKneeY: (landmarks.leftKnee.y + landmarks.rightKnee.y) / 2,
    avgHipY: hip.y,
  };
}

function scoreAll(
  landmarks: PoseLandmarks,
  f: MovementFeatures
): Record<AnalyzableExerciseType, number> {
  const lateralRaise =
    !f.isHorizontal && f.wristSpread > 0.22 && !f.wristAboveShoulder
      ? Math.min(
          100,
          40 +
            (f.elbowAngle > 120 && f.elbowAngle < 175 ? 25 : 0) +
            (Math.abs(landmarks.leftWrist.y - landmarks.leftShoulder.y) < 0.1
              ? 35
              : 0)
        )
      : 0;

  const highKnee =
    !f.isHorizontal &&
    (landmarks.leftKnee.y < landmarks.leftHip.y - 0.04 ||
      landmarks.rightKnee.y < landmarks.rightHip.y - 0.04)
      ? Math.min(100, 55 + (f.kneeAsymmetry > 15 ? 25 : 0))
      : 0;

  return {
    pushup:
      f.isHorizontal && f.elbowAngle > 70 && f.elbowAngle < 170
        ? Math.min(100, 40 + (f.bodyAlignment > 150 ? 35 : 0))
        : 0,
    plank:
      f.isHorizontal && f.bodyAlignment > 155
        ? Math.min(100, 30 + (f.bodyAlignment > 165 ? 40 : 0))
        : 0,
    squat:
      !f.isHorizontal && f.kneeAsymmetry < 25
        ? Math.min(100, 30 + (f.kneeAngle > 70 && f.kneeAngle < 175 ? 40 : 0))
        : 0,
    lunge:
      !f.isHorizontal && f.kneeAsymmetry > 30
        ? Math.min(100, 45 + (Math.min(f.leftKneeAngle, f.rightKneeAngle) < 110 ? 35 : 0))
        : 0,
    deadlift:
      !f.isHorizontal && f.torsoLean > 35 && f.torsoLean < 75
        ? Math.min(100, 35 + (f.hipBelowShoulder ? 30 : 0))
        : 0,
    shoulder_press:
      !f.isHorizontal && f.wristAboveShoulder
        ? Math.min(100, 50 + (f.torsoLean < 25 ? 30 : 0))
        : 0,
    lateral_raise: lateralRaise,
    bicep_curl:
      !f.isHorizontal && !f.wristAboveShoulder && f.elbowAngle < 160
        ? Math.min(100, 35 + (f.kneeAngle > 140 ? 35 : 0))
        : 0,
    high_knee: highKnee,
  };
}

export function classifyMovement(landmarks: PoseLandmarks): ClassificationResult {
  const features = extractFeatures(landmarks);
  const scores = scoreAll(landmarks, features);

  let best: AnalyzableExerciseType = "squat";
  let bestScore = 0;
  for (const [id, score] of Object.entries(scores) as [AnalyzableExerciseType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return {
    exercise: best,
    confidence: bestScore / 100,
    label: getExerciseLabel(best),
    scores,
  };
}

/** Smooth detections — require stable readings before switching */
export class MovementDetector {
  private history: AnalyzableExerciseType[] = [];
  private stableExercise: AnalyzableExerciseType = "squat";
  private lastConfidence = 0;
  private readonly windowSize = 12;
  private readonly minConfidence = 0.42;

  reset(): void {
    this.history = [];
    this.stableExercise = "squat";
    this.lastConfidence = 0;
  }

  detect(landmarks: PoseLandmarks): ClassificationResult {
    const result = classifyMovement(landmarks);
    this.history.push(result.exercise);
    if (this.history.length > this.windowSize) this.history.shift();

    const counts = new Map<AnalyzableExerciseType, number>();
    for (const ex of this.history) {
      counts.set(ex, (counts.get(ex) ?? 0) + 1);
    }

    let mode = result.exercise;
    let modeCount = 0;
    for (const [ex, count] of counts) {
      if (count > modeCount) {
        modeCount = count;
        mode = ex;
      }
    }

    if (
      result.confidence >= this.minConfidence &&
      modeCount >= Math.ceil(this.windowSize * 0.55)
    ) {
      this.stableExercise = mode;
    }
    this.lastConfidence = result.confidence;

    return {
      ...result,
      exercise: this.stableExercise,
      confidence: result.confidence,
      label: getExerciseLabel(this.stableExercise),
    };
  }

  getStableExercise(): AnalyzableExerciseType {
    return this.stableExercise;
  }

  getLastConfidence(): number {
    return this.lastConfidence;
  }
}
