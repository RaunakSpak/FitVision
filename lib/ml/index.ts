/**
 * Phase 7 — ML module public exports.
 * Swap HeuristicFormClassifier for a TF.js model via setFormClassifier().
 */

export {
  extractPoseFeatures,
  exportDatasetCSV,
  exportDatasetJSON,
  downloadTextFile,
  featuresToRecord,
  FEATURE_NAMES,
  type PoseFeatureVector,
} from "@/lib/ml/featureExtractor";

export {
  getFormClassifier,
  setFormClassifier,
  getMistakeLabel,
  ML_CONFIDENCE_THRESHOLD,
  HeuristicFormClassifier,
  type FormClassifier,
} from "@/lib/ml/formClassifier";

export {
  applyHybridAnalysis,
  summarizeMLSession,
} from "@/lib/ml/hybridAnalyzer";
