import type { AnalyzableExerciseType, ExerciseType, Point2D, PoseLandmarks } from "@/types/fitness";

/** MediaPipe Pose landmark indices */
export const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export const VISIBILITY_THRESHOLD = 0.5;

/** Skeleton connections for drawing overlay */
export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

const FULL_BODY: (keyof PoseLandmarks)[] = [
  "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
  "leftWrist", "rightWrist", "leftHip", "rightHip",
  "leftKnee", "rightKnee", "leftAnkle", "rightAnkle",
];

const LEGS: (keyof PoseLandmarks)[] = [
  "leftShoulder", "rightShoulder", "leftHip", "rightHip",
  "leftKnee", "rightKnee", "leftAnkle", "rightAnkle",
];

const UPPER: (keyof PoseLandmarks)[] = [
  "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
  "leftWrist", "rightWrist",
];

/** Required landmark keys per exercise */
const EXERCISE_LANDMARK_REQUIREMENTS: Record<
  ExerciseType,
  (keyof PoseLandmarks)[]
> = {
  auto_detect: FULL_BODY,
  pushup: FULL_BODY,
  squat: LEGS,
  lunge: LEGS,
  deadlift: LEGS,
  high_knee: LEGS,
  plank: [
    "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
    "leftHip", "rightHip", "leftAnkle", "rightAnkle",
  ],
  shoulder_press: UPPER,
  lateral_raise: UPPER,
  bicep_curl: UPPER,
};

export function getLandmarkRequirements(
  exercise: ExerciseType | AnalyzableExerciseType
): (keyof PoseLandmarks)[] {
  return EXERCISE_LANDMARK_REQUIREMENTS[exercise as ExerciseType] ?? FULL_BODY;
}

/**
 * Calculate angle at point B formed by points A-B-C (in degrees).
 */
export function calculateAngle(a: Point2D, b: Point2D, c: Point2D): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/** Euclidean distance between two normalized landmarks */
export function calculateDistance(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Angle of line A→B from vertical axis (0 = upright, 90 = horizontal) */
export function calculateVerticalLean(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(90 - Math.abs((Math.atan2(dy, dx) * 180) / Math.PI));
}

/** Average two landmarks for a mid-point */
export function averagePoint(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}

/** Check if a single landmark meets visibility threshold */
export function isLandmarkVisible(
  lm: { visibility?: number } | null | undefined,
  threshold = VISIBILITY_THRESHOLD
): boolean {
  return !!lm && (lm.visibility ?? 1) >= threshold;
}

/** Validate that all required keys are present and visible */
export function validateLandmarks(
  landmarks: PoseLandmarks,
  exercise: ExerciseType | AnalyzableExerciseType
): boolean {
  const required = getLandmarkRequirements(exercise);
  return required.every((key) =>
    isLandmarkVisible(landmarks[key])
  );
}

/** Extract normalized pose landmarks from MediaPipe result */
export function extractPoseLandmarks(
  landmarks: { x: number; y: number; visibility?: number }[]
): PoseLandmarks | null {
  const get = (index: number): Point2D | null => {
    const lm = landmarks[index];
    if (!isLandmarkVisible(lm)) return null;
    return { x: lm.x, y: lm.y, visibility: lm.visibility };
  };

  const leftShoulder = get(POSE_LANDMARKS.LEFT_SHOULDER);
  const rightShoulder = get(POSE_LANDMARKS.RIGHT_SHOULDER);
  const leftElbow = get(POSE_LANDMARKS.LEFT_ELBOW);
  const rightElbow = get(POSE_LANDMARKS.RIGHT_ELBOW);
  const leftWrist = get(POSE_LANDMARKS.LEFT_WRIST);
  const rightWrist = get(POSE_LANDMARKS.RIGHT_WRIST);
  const leftHip = get(POSE_LANDMARKS.LEFT_HIP);
  const rightHip = get(POSE_LANDMARKS.RIGHT_HIP);
  const leftKnee = get(POSE_LANDMARKS.LEFT_KNEE);
  const rightKnee = get(POSE_LANDMARKS.RIGHT_KNEE);
  const leftAnkle = get(POSE_LANDMARKS.LEFT_ANKLE);
  const rightAnkle = get(POSE_LANDMARKS.RIGHT_ANKLE);

  // Need at minimum shoulders to attempt any exercise
  if (!leftShoulder || !rightShoulder) return null;

  return {
    leftShoulder,
    rightShoulder,
    leftElbow: leftElbow ?? { x: 0, y: 0, visibility: 0 },
    rightElbow: rightElbow ?? { x: 0, y: 0, visibility: 0 },
    leftWrist: leftWrist ?? { x: 0, y: 0, visibility: 0 },
    rightWrist: rightWrist ?? { x: 0, y: 0, visibility: 0 },
    leftHip: leftHip ?? { x: 0, y: 0, visibility: 0 },
    rightHip: rightHip ?? { x: 0, y: 0, visibility: 0 },
    leftKnee: leftKnee ?? { x: 0, y: 0, visibility: 0 },
    rightKnee: rightKnee ?? { x: 0, y: 0, visibility: 0 },
    leftAnkle: leftAnkle ?? { x: 0, y: 0, visibility: 0 },
    rightAnkle: rightAnkle ?? { x: 0, y: 0, visibility: 0 },
  };
}

/** Rolling form score tracker shared across analyzers */
export class FormScoreTracker {
  private scores: number[] = [];

  reset(): void {
    this.scores = [];
  }

  update(issueCount: number): number {
    const score = Math.max(0, Math.min(100, 100 - issueCount * 20));
    this.scores.push(score);
    if (this.scores.length > 30) this.scores.shift();
    return Math.round(
      this.scores.reduce((a, b) => a + b, 0) / this.scores.length
    );
  }

  get current(): number {
    if (this.scores.length === 0) return 100;
    return Math.round(
      this.scores.reduce((a, b) => a + b, 0) / this.scores.length
    );
  }
}

/** Draw skeleton overlay on canvas from MediaPipe landmarks */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: { x: number; y: number; visibility?: number }[],
  width: number,
  height: number,
  isGoodForm: boolean
): void {
  ctx.clearRect(0, 0, width, height);

  const color = isGoodForm ? "#39ff14" : "#ff006e";
  const jointColor = isGoodForm ? "#00f5ff" : "#ff006e";

  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (!start || !end) continue;
    if (!isLandmarkVisible(start) || !isLandmarkVisible(end)) continue;

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  const keyIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (const idx of keyIndices) {
    const lm = landmarks[idx];
    if (!isLandmarkVisible(lm)) continue;
    ctx.fillStyle = jointColor;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Format seconds as M:SS */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
