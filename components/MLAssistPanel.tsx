"use client";

import type { MLAssistMeta } from "@/types/fitness";
import { getMistakeLabel } from "@/lib/ml/formClassifier";

interface MLAssistPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  lastMeta: MLAssistMeta | null;
  onOpenDatasetCollector?: () => void;
  datasetCollectorOpen: boolean;
  showDatasetButton?: boolean;
}

export default function MLAssistPanel({
  enabled,
  onToggle,
  lastMeta,
  onOpenDatasetCollector,
  datasetCollectorOpen,
  showDatasetButton = true,
}: MLAssistPanelProps) {
  const confidence = lastMeta?.prediction.confidence ?? 0;
  const confidencePct = Math.round(confidence * 100);

  return (
    <div className="trainer-panel pointer-events-auto w-full border-neon-purple/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-neon-purple/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-neon-purple">
            Experimental
          </span>
          <span className="text-[10px] font-bold text-white">ML Assist</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative h-5 w-9 rounded-full transition ${
            enabled ? "bg-neon-purple" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
              enabled ? "left-4" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <p className="mb-2 text-[9px] leading-relaxed text-slate-500">
        Not medical advice. Heuristic classifier augments rules — not a trained deep model.
      </p>

      {enabled && (
        <div className="space-y-2">
          <div>
            <div className="mb-1 flex justify-between text-[9px] text-slate-400">
              <span>Confidence</span>
              <span className="tabular-nums text-neon-cyan">{confidencePct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>

          {lastMeta && (
            <>
              <p className="text-[10px] text-slate-300">
                Label:{" "}
                <span className="text-white">
                  {lastMeta.prediction.label.replace("_", " ")}
                </span>
              </p>
              {lastMeta.prediction.predictedMistake &&
                lastMeta.prediction.predictedMistake !== "none" && (
                  <p className="text-[10px] text-neon-pink">
                    ML mistake:{" "}
                    {getMistakeLabel(lastMeta.prediction.predictedMistake)}
                  </p>
                )}
              <p className="text-[9px] text-slate-500">
                Features: {lastMeta.featureCount} · {lastMeta.explanation}
              </p>
            </>
          )}
        </div>
      )}

      {showDatasetButton && onOpenDatasetCollector && (
        <button
          type="button"
          onClick={onOpenDatasetCollector}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-slate-300 hover:border-neon-cyan/30 hover:text-neon-cyan"
        >
          {datasetCollectorOpen ? "Close Dataset Collector" : "Dataset Collector"}
        </button>
      )}
    </div>
  );
}
