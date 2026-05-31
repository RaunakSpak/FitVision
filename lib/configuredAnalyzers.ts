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
  computeAlignmentScore,
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

export interface RepAnalyzerConfig {
  upThreshold: number;
  downThreshold: number;
  upPhase: string;
  downPhase: string;
  repGoodMsg: string;
  feedbackGood: string;
  issueMessages: Record<string, string>;
  getPrimaryAngle: (landmarks: PoseLandmarks) => number;
  getVisibilityKeys: (landmarks: PoseLandmarks) => (keyof PoseLandmarks)[];
  detectIssues: (
    landmarks: PoseLandmarks,
    angle: number,
    phase: string
  ) => string[];
}

export class ConfigurableRepAnalyzer {
  private phase: string = "UP";
  private repInProgress = false;
  private activeIssues: string[] = [];
  private stats: RepExerciseStats = createInitialRepStats();
  private scorer = new SmartFormScorer();
  private config: RepAnalyzerConfig;

  constructor(config: RepAnalyzerConfig) {
    this.config = config;
    this.stats.currentPhase = config.upPhase;
    this.phase = config.upPhase;
  }

  reset(): void {
    this.phase = this.config.upPhase;
    this.repInProgress = false;
    this.activeIssues = [];
    this.stats = createInitialRepStats();
    this.stats.currentPhase = this.config.upPhase;
    this.scorer.reset();
  }

  getStats(): RepExerciseStats {
    return { ...this.stats };
  }

  analyze(landmarks: PoseLandmarks): AnalyzerResult {
    const angle = this.config.getPrimaryAngle(landmarks);
    let phase = "TRANSITION";
    if (angle > this.config.upThreshold) phase = this.config.upPhase;
    else if (angle < this.config.downThreshold) phase = this.config.downPhase;

    const issues = this.config.detectIssues(landmarks, angle, phase);
    const isGoodForm = issues.every((i) => i === "none");
    this.stats.currentPhase = phase;

    const repQuality =
      this.stats.totalReps > 0
        ? this.stats.goodReps / this.stats.totalReps
        : undefined;

    const visKeys = this.config.getVisibilityKeys(landmarks);
    const visibilityScore =
      visKeys.reduce((a, k) => a + (landmarks[k].visibility ?? 0), 0) /
      visKeys.length;

    this.stats.formScore = this.scorer.update({
      issues,
      visibilityScore,
      rangeOfMotionScore: computeRangeOfMotionScore(
        angle,
        this.config.downThreshold,
        this.config.upThreshold
      ),
      alignmentScore: computeAlignmentScore(170, 170, 30),
      repQualityRatio: repQuality,
    });

    const repResult = this.updateRepState(phase, issues);
    if (repResult) this.applyRep(repResult);

    const primary = issues.find((i) => i !== "none");
    const { feedback, repCompleted } = resolveRepFeedback(
      primary ? this.config.issueMessages[primary] : this.config.feedbackGood,
      isGoodForm,
      repResult,
      this.config.repGoodMsg,
      this.config.issueMessages
    );

    return buildResult(
      feedback,
      isGoodForm,
      phase,
      this.stats.formScore,
      { primaryAngle: angle },
      issues,
      repCompleted
    );
  }

  private updateRepState(phase: string, issues: string[]): RepResult | null {
    const prev = this.phase;
    const down = this.config.downPhase;

    if (phase === down && prev !== down) {
      this.repInProgress = true;
      this.activeIssues = [...issues];
    } else if (phase === down && this.repInProgress) {
      this.activeIssues = accumulateIssues(this.activeIssues, issues);
    }

    if (phase === this.config.upPhase && prev === down && this.repInProgress) {
      this.repInProgress = false;
      const active = this.activeIssues.filter((i) => i !== "none");
      this.phase = phase;
      this.activeIssues = [];
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

const VIS_LEGS: (keyof PoseLandmarks)[] = [
  "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle",
];
const VIS_UPPER: (keyof PoseLandmarks)[] = [
  "leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftWrist", "rightWrist",
];

export function createLungeAnalyzer(): ConfigurableRepAnalyzer {
  return new ConfigurableRepAnalyzer({
    upThreshold: 155,
    downThreshold: 100,
    upPhase: "STANDING",
    downPhase: "DOWN",
    repGoodMsg: "Good lunge counted",
    feedbackGood: "Great lunge form",
    issueMessages: {
      none: "Great lunge form",
      not_deep_enough: "Go deeper on your lunge",
      torso_lean: "Keep your chest up",
      knees_collapse: "Keep front knee aligned",
    },
    getPrimaryAngle: (lm) => {
      const left = calculateAngle(lm.leftHip, lm.leftKnee, lm.leftAnkle);
      const right = calculateAngle(lm.rightHip, lm.rightKnee, lm.rightAnkle);
      return Math.min(left, right);
    },
    getVisibilityKeys: () => VIS_LEGS,
    detectIssues: (lm, angle, phase) => {
      const issues: string[] = [];
      if (phase === "DOWN" && angle > 115) issues.push("not_deep_enough");
      const shoulder = averagePoint(lm.leftShoulder, lm.rightShoulder);
      const hip = averagePoint(lm.leftHip, lm.rightHip);
      if (calculateVerticalLean(shoulder, hip) > 35) issues.push("torso_lean");
      return issues.length ? issues : ["none"];
    },
  });
}

export function createShoulderPressAnalyzer(): ConfigurableRepAnalyzer {
  return new ConfigurableRepAnalyzer({
    upThreshold: 155,
    downThreshold: 90,
    upPhase: "EXTENDED",
    downPhase: "UP",
    repGoodMsg: "Good press counted",
    feedbackGood: "Great press form",
    issueMessages: {
      none: "Great press form",
      incomplete_rep: "Press higher overhead",
      torso_lean: "Keep core tight",
      body_not_straight: "Stand tall",
    },
    getPrimaryAngle: (lm) => {
      const left = calculateAngle(lm.leftShoulder, lm.leftElbow, lm.leftWrist);
      const right = calculateAngle(lm.rightShoulder, lm.rightElbow, lm.rightWrist);
      return (left + right) / 2;
    },
    getVisibilityKeys: () => VIS_UPPER,
    detectIssues: (lm, angle, phase) => {
      const issues: string[] = [];
      if (phase === "UP" && angle > 110) issues.push("incomplete_rep");
      const shoulder = averagePoint(lm.leftShoulder, lm.rightShoulder);
      const hip = averagePoint(lm.leftHip, lm.rightHip);
      if (calculateVerticalLean(shoulder, hip) > 20) issues.push("torso_lean");
      return issues.length ? issues : ["none"];
    },
  });
}

export function createLateralRaiseAnalyzer(): ConfigurableRepAnalyzer {
  return new ConfigurableRepAnalyzer({
    upThreshold: 150,
    downThreshold: 80,
    upPhase: "UP",
    downPhase: "DOWN",
    repGoodMsg: "Good raise counted",
    feedbackGood: "Great raise form",
    issueMessages: {
      none: "Great raise form",
      incomplete_rep: "Raise arms higher",
      elbow_unstable: "Keep a soft elbow bend",
    },
    getPrimaryAngle: (lm) => {
      const spread = Math.abs(lm.leftWrist.x - lm.rightWrist.x);
      const height =
        1 -
        (lm.leftWrist.y + lm.rightWrist.y) / 2 -
        (lm.leftShoulder.y + lm.rightShoulder.y) / 2;
      return spread * 100 + height * 80;
    },
    getVisibilityKeys: () => VIS_UPPER,
    detectIssues: (_lm, angle, phase) => {
      const issues: string[] = [];
      if (phase === "DOWN" && angle < 120) issues.push("incomplete_rep");
      return issues.length ? issues : ["none"];
    },
  });
}

export function createDeadliftAnalyzer(): ConfigurableRepAnalyzer {
  return new ConfigurableRepAnalyzer({
    upThreshold: 155,
    downThreshold: 110,
    upPhase: "STANDING",
    downPhase: "DOWN",
    repGoodMsg: "Good rep counted",
    feedbackGood: "Great hinge form",
    issueMessages: {
      none: "Great hinge form",
      torso_lean: "Keep back flat — chest up",
      not_deep_enough: "Hinge deeper at the hips",
      body_not_straight: "Neutral spine",
    },
    getPrimaryAngle: (lm) => {
      const shoulder = averagePoint(lm.leftShoulder, lm.rightShoulder);
      const hip = averagePoint(lm.leftHip, lm.rightHip);
      return calculateVerticalLean(shoulder, hip);
    },
    getVisibilityKeys: () => [...VIS_LEGS, "leftShoulder", "rightShoulder"],
    detectIssues: (lm, lean, phase) => {
      const issues: string[] = [];
      if (phase === "DOWN" && lean < 40) issues.push("not_deep_enough");
      if (lean > 70) issues.push("body_not_straight");
      const shoulder = averagePoint(lm.leftShoulder, lm.rightShoulder);
      const hip = averagePoint(lm.leftHip, lm.rightHip);
      if (calculateVerticalLean(shoulder, hip) > 55) issues.push("torso_lean");
      return issues.length ? issues : ["none"];
    },
  });
}

export function createHighKneeAnalyzer(): ConfigurableRepAnalyzer {
  return new ConfigurableRepAnalyzer({
    upThreshold: 30,
    downThreshold: 80,
    upPhase: "UP",
    downPhase: "DOWN",
    repGoodMsg: "Good rep counted",
    feedbackGood: "Great tempo",
    issueMessages: {
      none: "Great tempo",
      torso_lean: "Stay upright",
      incomplete_rep: "Drive knee higher",
    },
    getPrimaryAngle: (lm) => {
      const leftUp = lm.leftHip.y - lm.leftKnee.y;
      const rightUp = lm.rightHip.y - lm.rightKnee.y;
      return Math.max(leftUp, rightUp) * 500;
    },
    getVisibilityKeys: () => VIS_LEGS,
    detectIssues: (lm, angle, phase) => {
      const issues: string[] = [];
      if (phase === "DOWN" && angle < 50) issues.push("incomplete_rep");
      const shoulder = averagePoint(lm.leftShoulder, lm.rightShoulder);
      const hip = averagePoint(lm.leftHip, lm.rightHip);
      if (calculateVerticalLean(shoulder, hip) > 25) issues.push("torso_lean");
      return issues.length ? issues : ["none"];
    },
  });
}
