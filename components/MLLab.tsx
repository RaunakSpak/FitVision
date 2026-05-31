"use client";

import { useState } from "react";
import DatasetCollector from "@/components/DatasetCollector";
import MLAssistPanel from "@/components/MLAssistPanel";
import SafetyDisclaimer from "@/components/SafetyDisclaimer";
import EmptyState from "@/components/EmptyState";
import { useMLAssist } from "@/hooks/useMLAssist";
import { FEATURE_NAMES } from "@/lib/ml/featureExtractor";

export default function MLLab() {
  const {
    mlAssistEnabled,
    setMlAssistEnabled,
    lastMLMeta,
  } = useMLAssist();

  const [collectorOpen, setCollectorOpen] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-black to-slate-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:pb-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-neon-purple/15 px-3 py-1 text-[10px] font-bold uppercase text-neon-purple">
              Experimental
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              ML<span className="text-neon-purple"> Lab</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Feature extraction, heuristic classifier, and dataset export — training-ready pipeline
              for future TensorFlow.js models.
            </p>
          </div>

          <SafetyDisclaimer />

          <MLAssistPanel
            enabled={mlAssistEnabled}
            onToggle={setMlAssistEnabled}
            lastMeta={lastMLMeta}
            onOpenDatasetCollector={() => setCollectorOpen(true)}
            datasetCollectorOpen={collectorOpen}
          />

          <div className="glass-card border border-white/10 p-5">
            <h2 className="text-sm font-bold text-white">Feature vector</h2>
            <p className="mt-1 text-xs text-slate-400">
              {FEATURE_NAMES.length} numeric features per pose frame — angles, alignment,
              visibility, ROM, phase, and exercise encoding.
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {FEATURE_NAMES.slice(0, 8).map((n) => (
                <span
                  key={n}
                  className="rounded bg-white/5 px-2 py-0.5 text-[9px] text-slate-500"
                >
                  {n}
                </span>
              ))}
              <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] text-slate-500">
                +{FEATURE_NAMES.length - 8} more
              </span>
            </div>
          </div>

          <div className="glass-card border border-white/10 p-5">
            <h2 className="text-sm font-bold text-white">Training pipeline</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-400">
              <li>1. Collect labeled samples via Dataset Collector</li>
              <li>2. Export JSON or CSV for offline training</li>
              <li>3. Train a model (Python / TF.js) on exported features</li>
              <li>4. Swap in via <code className="text-neon-cyan">setFormClassifier()</code></li>
            </ol>
          </div>

          {!mlAssistEnabled && (
            <EmptyState
              icon="🧠"
              title="ML Assist is off"
              description="Enable ML Assist above to augment rule-based scoring during live training and video analysis."
              actionLabel="Enable ML Assist"
              onAction={() => setMlAssistEnabled(true)}
            />
          )}
        </div>
      </div>

      <DatasetCollector
        open={collectorOpen}
        onClose={() => setCollectorOpen(false)}
      />
    </div>
  );
}
