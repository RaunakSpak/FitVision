import type { AnalyzerResult, RepResult } from "@/types/fitness";

/** Accumulate form issues during a rep's active phase */
export function accumulateIssues(
  current: string[],
  incoming: string[]
): string[] {
  const merged = [...current];
  for (const issue of incoming) {
    if (issue !== "none" && !merged.includes(issue)) {
      merged.push(issue);
    }
  }
  return merged;
}

/** Build AnalyzerResult from frame analysis + stats */
export function buildResult(
  feedback: string,
  isGoodForm: boolean,
  phase: string,
  formScore: number,
  metrics: AnalyzerResult["metrics"],
  issues: string[],
  repCompleted = false
): AnalyzerResult {
  return {
    feedback,
    isGoodForm,
    phase,
    formScore,
    metrics,
    issues,
    repCompleted,
  };
}

/** Resolve live vs rep-completion feedback */
export function resolveRepFeedback(
  liveFeedback: string,
  isGoodForm: boolean,
  repResult: RepResult | null,
  repGoodMsg: string,
  issueMessages: Record<string, string>
): { feedback: string; repCompleted: boolean } {
  if (repResult?.isGoodForm) {
    return { feedback: repGoodMsg, repCompleted: true };
  }
  if (repResult && !repResult.isGoodForm) {
    const primary = repResult.issues[0];
    return {
      feedback: primary ? (issueMessages[primary] ?? liveFeedback) : liveFeedback,
      repCompleted: true,
    };
  }
  return { feedback: isGoodForm ? liveFeedback : liveFeedback, repCompleted: false };
}
