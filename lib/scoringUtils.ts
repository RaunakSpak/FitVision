import type { AnalyzableExerciseType } from "@/types/fitness";

export type Grade = "A" | "B" | "C" | "D";

export interface FrameScoreInput {
  issues: string[];
  visibilityScore: number;
  rangeOfMotionScore: number;
  alignmentScore: number;
  repQualityRatio?: number;
  totalMistakeCount?: number;
  framesTracked?: number;
}

/** Map numeric score to letter grade */
export function scoreToGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  return "D";
}

export function gradeColor(grade: Grade): string {
  switch (grade) {
    case "A":
      return "text-neon-green";
    case "B":
      return "text-neon-cyan";
    case "C":
      return "text-neon-purple";
    case "D":
      return "text-neon-pink";
  }
}

/** Compute a single frame score from multiple quality signals (0–100) */
export function calculateFrameScore(input: FrameScoreInput): number {
  const activeIssues = input.issues.filter((i) => i !== "none");
  const issuePenalty = Math.min(50, activeIssues.length * 12);

  const visibilityWeight = 0.15;
  const romWeight = 0.2;
  const alignmentWeight = 0.25;
  const issueWeight = 0.25;
  const repWeight = 0.15;

  const visibilityComponent = input.visibilityScore * 100;
  const romComponent = input.rangeOfMotionScore;
  const alignmentComponent = input.alignmentScore;
  const issueComponent = Math.max(0, 100 - issuePenalty);
  const repComponent =
    input.repQualityRatio !== undefined
      ? input.repQualityRatio * 100
      : 100;

  let score =
    visibilityComponent * visibilityWeight +
    romComponent * romWeight +
    alignmentComponent * alignmentWeight +
    issueComponent * issueWeight +
    repComponent * repWeight;

  if (input.totalMistakeCount !== undefined && input.framesTracked) {
    const freq = input.totalMistakeCount / Math.max(1, input.framesTracked / 30);
    score -= Math.min(15, freq * 3);
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Rolling smart form scorer for live workout display */
export class SmartFormScorer {
  private scores: number[] = [];
  private totalMistakeEvents = 0;
  private framesTracked = 0;

  reset(): void {
    this.scores = [];
    this.totalMistakeEvents = 0;
    this.framesTracked = 0;
  }

  update(input: FrameScoreInput): number {
    this.framesTracked += 1;
    const activeIssues = input.issues.filter((i) => i !== "none");
    if (activeIssues.length > 0) {
      this.totalMistakeEvents += activeIssues.length;
    }

    const frameScore = calculateFrameScore({
      ...input,
      totalMistakeCount: this.totalMistakeEvents,
      framesTracked: this.framesTracked,
    });

    this.scores.push(frameScore);
    if (this.scores.length > 45) this.scores.shift();

    return this.getCurrent();
  }

  getCurrent(): number {
    if (this.scores.length === 0) return 100;
    return Math.round(
      this.scores.reduce((a, b) => a + b, 0) / this.scores.length
    );
  }
}

/** Average landmark visibility for required exercise joints (0–1) */
export function computeVisibilityScore(
  landmarks: { visibility?: number }[],
  indices: number[]
): number {
  if (indices.length === 0) return 1;
  const sum = indices.reduce(
    (acc, idx) => acc + (landmarks[idx]?.visibility ?? 0),
    0
  );
  return Math.min(1, sum / indices.length);
}

/** Alignment score from body line angle (180° = perfect) */
export function computeAlignmentScore(angle: number, ideal = 175, tolerance = 25): number {
  const deviation = Math.abs(angle - ideal);
  return Math.max(0, Math.min(100, 100 - (deviation / tolerance) * 100));
}

/** Range-of-motion score from joint angle depth */
export function computeRangeOfMotionScore(
  angle: number,
  targetDepth: number,
  maxAngle: number
): number {
  if (angle <= targetDepth) return 100;
  const range = maxAngle - targetDepth;
  if (range <= 0) return 100;
  const progress = (maxAngle - angle) / range;
  return Math.max(0, Math.min(100, progress * 100));
}

export const EXERCISE_VISIBILITY_INDICES: Record<AnalyzableExerciseType, number[]> = {
  pushup: [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
  squat: [11, 12, 23, 24, 25, 26, 27, 28],
  lunge: [11, 12, 23, 24, 25, 26, 27, 28],
  deadlift: [11, 12, 23, 24, 25, 26, 27, 28],
  high_knee: [11, 12, 23, 24, 25, 26, 27, 28],
  plank: [11, 12, 13, 14, 23, 24, 27, 28],
  shoulder_press: [11, 12, 13, 14, 15, 16],
  lateral_raise: [11, 12, 13, 14, 15, 16],
  bicep_curl: [11, 12, 13, 14, 15, 16],
};
