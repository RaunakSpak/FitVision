/**
 * Phase 7 — pose feature extraction for ML pipeline.
 * Produces a fixed-length numeric vector ready for export or classifier input.
 */

import {
  averagePoint,
  calculateAngle,
  calculateDistance,
  calculateVerticalLean,
} from "@/lib/poseUtils";
import type {
  AnalyzableExerciseType,
  AnalyzerMetrics,
  ExercisePhase,
  PoseLandmarks,
} from "@/types/fitness";

export const FEATURE_NAMES = [
  "left_elbow_angle",
  "right_elbow_angle",
  "left_knee_angle",
  "right_knee_angle",
  "left_hip_angle",
  "right_hip_angle",
  "body_alignment",
  "torso_lean",
  "shoulder_width_norm",
  "hip_width_norm",
  "torso_length_norm",
  "avg_visibility",
  "primary_rom",
  "secondary_rom",
  "phase_code",
  "exercise_code",
  "wrist_hip_ratio_l",
  "wrist_hip_ratio_r",
  "knee_separation_norm",
  "head_hip_vertical",
] as const;

export interface PoseFeatureVector {
  values: number[];
  names: readonly string[];
  exercise: AnalyzableExerciseType;
  timestamp: number;
}

const EXERCISE_CODES: Record<AnalyzableExerciseType, number> = {
  pushup: 0.1,
  squat: 0.2,
  plank: 0.3,
  bicep_curl: 0.4,
  lunge: 0.5,
  shoulder_press: 0.6,
  lateral_raise: 0.7,
  deadlift: 0.8,
  high_knee: 0.9,
};

function phaseToCode(phase: ExercisePhase | string): number {
  switch (phase) {
    case "UP":
    case "STANDING":
    case "EXTENDED":
      return 0;
    case "DOWN":
    case "CURL":
      return 0.5;
    case "HOLD":
      return 0.75;
    case "TRANSITION":
      return 0.25;
    case "REST":
      return 1;
    default:
      return 0.5;
  }
}

function avgVisibility(landmarks: PoseLandmarks): number {
  const keys = Object.keys(landmarks) as (keyof PoseLandmarks)[];
  const sum = keys.reduce((acc, k) => acc + (landmarks[k].visibility ?? 1), 0);
  return sum / keys.length;
}

function normalizeAngle(angle: number): number {
  return Math.min(1, Math.max(0, angle / 180));
}

/** Extract numeric features from pose + analyzer context. */
export function extractPoseFeatures(
  landmarks: PoseLandmarks,
  exercise: AnalyzableExerciseType,
  metrics: AnalyzerMetrics = {},
  phase: ExercisePhase | string = "TRANSITION"
): PoseFeatureVector {
  const midShoulder = averagePoint(landmarks.leftShoulder, landmarks.rightShoulder);
  const midHip = averagePoint(landmarks.leftHip, landmarks.rightHip);
  const midAnkle = averagePoint(landmarks.leftAnkle, landmarks.rightAnkle);

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
  const bodyAlignment = calculateAngle(midShoulder, midHip, midAnkle);
  const torsoLean = calculateVerticalLean(midShoulder, midHip);

  const shoulderWidth = calculateDistance(
    landmarks.leftShoulder,
    landmarks.rightShoulder
  );
  const hipWidth = calculateDistance(landmarks.leftHip, landmarks.rightHip);
  const torsoLength = calculateDistance(midShoulder, midHip);

  const primaryRom = normalizeAngle(metrics.primaryAngle ?? leftKnee);
  const secondaryRom = normalizeAngle(metrics.secondaryAngle ?? leftElbow);

  const wristHipL =
    calculateDistance(landmarks.leftWrist, landmarks.leftHip) /
    Math.max(torsoLength, 0.01);
  const wristHipR =
    calculateDistance(landmarks.rightWrist, landmarks.rightHip) /
    Math.max(torsoLength, 0.01);
  const kneeSep =
    calculateDistance(landmarks.leftKnee, landmarks.rightKnee) /
    Math.max(hipWidth, 0.01);
  const headHipVertical = Math.abs(midShoulder.y - midHip.y);

  const values = [
    normalizeAngle(leftElbow),
    normalizeAngle(rightElbow),
    normalizeAngle(leftKnee),
    normalizeAngle(rightKnee),
    normalizeAngle(leftHipAngle),
    normalizeAngle(rightHipAngle),
    normalizeAngle(bodyAlignment),
    normalizeAngle(torsoLean),
    Math.min(1, shoulderWidth * 4),
    Math.min(1, hipWidth * 4),
    Math.min(1, torsoLength * 3),
    avgVisibility(landmarks),
    primaryRom,
    secondaryRom,
    phaseToCode(phase),
    EXERCISE_CODES[exercise],
    Math.min(2, wristHipL),
    Math.min(2, wristHipR),
    Math.min(2, kneeSep),
    Math.min(1, headHipVertical * 2),
  ];

  return {
    values,
    names: FEATURE_NAMES,
    exercise,
    timestamp: Date.now(),
  };
}

export function featuresToRecord(
  vector: PoseFeatureVector,
  formLabel: string,
  mistakeType: string
): Record<string, number | string> {
  const row: Record<string, number | string> = {
    exercise: vector.exercise,
    form_label: formLabel,
    mistake_type: mistakeType,
    timestamp: vector.timestamp,
  };
  vector.names.forEach((name, i) => {
    row[name] = Number(vector.values[i].toFixed(6));
  });
  return row;
}

export function exportDatasetJSON(
  samples: Record<string, number | string>[]
): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      featureNames: [...FEATURE_NAMES],
      sampleCount: samples.length,
      samples,
    },
    null,
    2
  );
}

export function exportDatasetCSV(
  samples: Record<string, number | string>[]
): string {
  if (samples.length === 0) return "";
  const headers = Object.keys(samples[0]);
  const lines = [
    headers.join(","),
    ...samples.map((row) =>
      headers.map((h) => String(row[h] ?? "")).join(",")
    ),
  ];
  return lines.join("\n");
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime: string
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
