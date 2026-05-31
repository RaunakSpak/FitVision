/**
 * Phase 7 — lightweight form classifier (heuristic placeholder).
 * Interface is stable for future TensorFlow.js model swap-in.
 */

import type { PoseFeatureVector } from "@/lib/ml/featureExtractor";
import type {
  AnalyzableExerciseType,
  ClassifierPrediction,
  MLMistakeType,
} from "@/types/fitness";

export type { ClassifierPrediction };

export interface FormClassifier {
  predict(features: PoseFeatureVector): ClassifierPrediction;
}

/** Confidence threshold before hybrid layer applies score/mistake adjustments. */
export const ML_CONFIDENCE_THRESHOLD = 0.62;

type FeatureIndex = Record<string, number>;

function idx(names: readonly string[]): FeatureIndex {
  return Object.fromEntries(names.map((n, i) => [n, i]));
}

/**
 * Heuristic placeholder — NOT a trained neural network.
 * Uses interpretable thresholds per exercise until TF.js weights are added.
 */
export class HeuristicFormClassifier implements FormClassifier {
  predict(features: PoseFeatureVector): ClassifierPrediction {
    const map = idx(features.names);
    const v = features.values;
    const get = (name: string) => v[map[name] ?? 0] ?? 0;

    const bodyAlignment = get("body_alignment");
    const torsoLean = get("torso_lean");
    const primaryRom = get("primary_rom");
    const leftKnee = get("left_knee_angle");
    const avgVis = get("avg_visibility");

    if (avgVis < 0.45) {
      return {
        label: "bad_form",
        confidence: 0.55,
        predictedMistake: null,
        scoreAdjustment: -2,
      };
    }

    switch (features.exercise) {
      case "pushup":
      case "plank":
        return this.classifyAlignment(bodyAlignment, torsoLean);
      case "squat":
      case "lunge":
      case "deadlift":
        return this.classifySquatPattern(bodyAlignment, leftKnee, primaryRom, torsoLean);
      case "bicep_curl":
        return this.classifyCurl(get("left_elbow_angle"), get("right_elbow_angle"));
      case "shoulder_press":
      case "lateral_raise":
        return this.classifyUpper(bodyAlignment, get("left_elbow_angle"));
      case "high_knee":
        return this.classifyHighKnee(primaryRom, leftKnee);
      default:
        return this.neutralGood();
    }
  }

  private classifyAlignment(
    bodyAlignment: number,
    torsoLean: number
  ): ClassifierPrediction {
    if (bodyAlignment > 0.72 || torsoLean > 0.55) {
      const mistake: MLMistakeType =
        bodyAlignment > 0.78 ? "hips_too_low" : "body_not_straight";
      const severity = Math.max(bodyAlignment, torsoLean);
      return {
        label: "bad_form",
        confidence: Math.min(0.92, 0.6 + severity * 0.35),
        predictedMistake: mistake,
        scoreAdjustment: -Math.round(severity * 10),
      };
    }
    return {
      label: "good_form",
      confidence: Math.min(0.88, 0.55 + (0.72 - bodyAlignment) * 0.5),
      predictedMistake: null,
      scoreAdjustment: 2,
    };
  }

  private classifySquatPattern(
    bodyAlignment: number,
    kneeAngle: number,
    rom: number,
    torsoLean: number
  ): ClassifierPrediction {
    if (kneeAngle > 0.75 && rom < 0.45) {
      return {
        label: "bad_form",
        confidence: 0.78,
        predictedMistake: "not_deep_enough",
        scoreAdjustment: -6,
      };
    }
    if (torsoLean > 0.6) {
      return {
        label: "bad_form",
        confidence: 0.74,
        predictedMistake: "torso_lean",
        scoreAdjustment: -5,
      };
    }
    if (bodyAlignment > 0.7) {
      return {
        label: "bad_form",
        confidence: 0.7,
        predictedMistake: "hips_too_low",
        scoreAdjustment: -4,
      };
    }
    return this.neutralGood();
  }

  private classifyCurl(
    leftElbow: number,
    rightElbow: number
  ): ClassifierPrediction {
    const spread = Math.abs(leftElbow - rightElbow);
    if (spread > 0.22) {
      return {
        label: "bad_form",
        confidence: 0.71,
        predictedMistake: "elbow_unstable",
        scoreAdjustment: -5,
      };
    }
    if (leftElbow < 0.35 || rightElbow < 0.35) {
      return {
        label: "bad_form",
        confidence: 0.68,
        predictedMistake: "incomplete_rep",
        scoreAdjustment: -4,
      };
    }
    return this.neutralGood();
  }

  private classifyUpper(
    bodyAlignment: number,
    elbowAngle: number
  ): ClassifierPrediction {
    if (bodyAlignment > 0.68) {
      return {
        label: "bad_form",
        confidence: 0.69,
        predictedMistake: "torso_lean",
        scoreAdjustment: -4,
      };
    }
    if (elbowAngle < 0.3) {
      return {
        label: "bad_form",
        confidence: 0.66,
        predictedMistake: "incomplete_rep",
        scoreAdjustment: -3,
      };
    }
    return this.neutralGood();
  }

  private classifyHighKnee(rom: number, knee: number): ClassifierPrediction {
    if (rom < 0.4 && knee < 0.5) {
      return {
        label: "bad_form",
        confidence: 0.67,
        predictedMistake: "incomplete_rep",
        scoreAdjustment: -4,
      };
    }
    return this.neutralGood();
  }

  private neutralGood(): ClassifierPrediction {
    return {
      label: "good_form",
      confidence: 0.64,
      predictedMistake: null,
      scoreAdjustment: 1,
    };
  }
}

let defaultClassifier: FormClassifier | null = null;

export function getFormClassifier(): FormClassifier {
  if (!defaultClassifier) {
    defaultClassifier = new HeuristicFormClassifier();
  }
  return defaultClassifier;
}

/** Swap in a TF.js model implementation later without changing hybrid layer. */
export function setFormClassifier(classifier: FormClassifier): void {
  defaultClassifier = classifier;
}

export function getMistakeLabel(type: MLMistakeType): string {
  const labels: Record<MLMistakeType, string> = {
    hips_too_low: "Hips too low",
    hips_too_high: "Hips too high",
    not_deep_enough: "Not deep enough",
    elbow_unstable: "Elbow unstable",
    torso_lean: "Torso lean",
    incomplete_rep: "Incomplete rep",
    body_not_straight: "Body not straight",
    none: "None",
  };
  return labels[type] ?? type;
}

export function exerciseSupportsML(exercise: AnalyzableExerciseType): boolean {
  const supported: AnalyzableExerciseType[] = [
    "pushup",
    "squat",
    "plank",
    "bicep_curl",
    "lunge",
    "shoulder_press",
    "lateral_raise",
    "deadlift",
    "high_knee",
  ];
  return supported.includes(exercise);
}
