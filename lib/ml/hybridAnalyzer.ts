/**
 * Phase 7 — combines rule-based analyzer output with ML classifier hints.
 * Rule-based logic remains primary; ML only nudges score and adds mistakes.
 */

import { extractPoseFeatures } from "@/lib/ml/featureExtractor";
import {
  getFormClassifier,
  getMistakeLabel,
  ML_CONFIDENCE_THRESHOLD,
} from "@/lib/ml/formClassifier";
import { getMistakeLabel as getRuleMistakeLabel } from "@/lib/mistakeLabels";
import type { MLMistakeType, AnalyzerResult, HybridAnalyzerResult, MLAssistMeta, PoseLandmarks, AnalyzableExerciseType } from "@/types/fitness";

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function mergeIssues(
  ruleIssues: string[],
  mlMistake: string | null
): string[] {
  if (!mlMistake || mlMistake === "none") return ruleIssues;
  if (ruleIssues.includes(mlMistake)) return ruleIssues;
  return [...ruleIssues, mlMistake];
}

function buildExplanation(
  rule: AnalyzerResult,
  meta: MLAssistMeta
): string {
  const { prediction } = meta;
  if (prediction.confidence < ML_CONFIDENCE_THRESHOLD) {
    return "ML assist: low confidence — using rule-based result only.";
  }
  if (prediction.label === "good_form") {
    return `ML assist: good form signal (${Math.round(prediction.confidence * 100)}% conf).`;
  }
  const mistake = prediction.predictedMistake
    ? getMistakeLabel(prediction.predictedMistake)
    : "form issue";
  return `ML assist: possible ${mistake.toLowerCase()} (${Math.round(prediction.confidence * 100)}% conf).`;
}

/**
 * Apply hybrid scoring — never fully overrides rule-based analyzer.
 */
export function applyHybridAnalysis(
  ruleResult: AnalyzerResult,
  landmarks: PoseLandmarks,
  exercise: AnalyzableExerciseType,
  mlEnabled: boolean
): HybridAnalyzerResult {
  if (!mlEnabled) {
    return { ...ruleResult };
  }

  const features = extractPoseFeatures(
    landmarks,
    exercise,
    ruleResult.metrics,
    ruleResult.phase
  );
  const prediction = getFormClassifier().predict(features);

  const meta: MLAssistMeta = {
    enabled: true,
    prediction,
    featureCount: features.values.length,
    explanation: "",
  };

  meta.explanation = buildExplanation(ruleResult, meta);

  if (prediction.confidence < ML_CONFIDENCE_THRESHOLD) {
    return { ...ruleResult, mlAssist: meta };
  }

  let formScore = ruleResult.formScore + prediction.scoreAdjustment;
  formScore = clampScore(formScore);

  const issues = mergeIssues(
    ruleResult.issues,
    prediction.predictedMistake
  );

  let feedback = ruleResult.feedback;
  if (
    prediction.label === "bad_form" &&
    prediction.predictedMistake &&
    !ruleResult.feedback.toLowerCase().includes("ml")
  ) {
    const hint = getRuleMistakeLabel(prediction.predictedMistake);
    if (!ruleResult.feedback.includes(hint)) {
      feedback = `${ruleResult.feedback} · ML hint: ${hint}`;
    }
  }

  return {
    ...ruleResult,
    formScore,
    issues,
    feedback,
    isGoodForm: ruleResult.isGoodForm,
    mlAssist: meta,
  };
}

export function summarizeMLSession(
  frames: MLAssistMeta[]
): {
  avgConfidence: number;
  adjustedFrames: number;
  topMlMistake: string | null;
} {
  if (frames.length === 0) {
    return { avgConfidence: 0, adjustedFrames: 0, topMlMistake: null };
  }
  const confidences = frames.map((f) => f.prediction.confidence);
  const avgConfidence =
    confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const adjustedFrames = frames.filter(
    (f) => f.prediction.confidence >= ML_CONFIDENCE_THRESHOLD
  ).length;
  const mistakeCounts: Record<string, number> = {};
  for (const f of frames) {
    const m = f.prediction.predictedMistake;
    if (m && m !== "none") {
      mistakeCounts[m] = (mistakeCounts[m] ?? 0) + 1;
    }
  }
  const top = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0];
  return {
    avgConfidence,
    adjustedFrames,
    topMlMistake: top ? getMistakeLabel(top[0] as MLMistakeType) : null,
  };
}
