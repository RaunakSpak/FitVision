"use client";

import type { AnalyzerMetrics, ExerciseType } from "@/types/fitness";

interface MetricsPanelProps {
  exercise: ExerciseType;
  metrics?: AnalyzerMetrics;
  poseDetected: boolean;
}

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}

export default function MetricsPanel({
  exercise,
  metrics,
  poseDetected,
}: MetricsPanelProps) {
  if (!poseDetected || !metrics) {
    return (
      <div className="trainer-panel pointer-events-none w-full p-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-neon-cyan/70">
          Precision
        </p>
        <p className="text-xs text-slate-500">Waiting for pose…</p>
      </div>
    );
  }

  const rows: { label: string; value: string; color: string }[] = [];

  if (metrics.primaryAngle !== undefined) {
    rows.push({
      label: "Elbow",
      value: `${metrics.primaryAngle.toFixed(0)}°`,
      color: "text-neon-cyan",
    });
  }
  if (metrics.kneeAngle !== undefined) {
    rows.push({
      label: "Knee",
      value: `${metrics.kneeAngle.toFixed(0)}°`,
      color: "text-neon-green",
    });
  }
  if (metrics.hipAngle !== undefined) {
    rows.push({
      label: "Hip",
      value: `${metrics.hipAngle.toFixed(0)}°`,
      color: "text-neon-purple",
    });
  }
  if (metrics.torsoLean !== undefined) {
    rows.push({
      label: "Torso",
      value: `${metrics.torsoLean.toFixed(0)}°`,
      color: "text-neon-pink",
    });
  }
  if (metrics.bodyAlignmentAngle !== undefined) {
    rows.push({
      label: "Align",
      value: `${metrics.bodyAlignmentAngle.toFixed(0)}°`,
      color: "text-neon-purple",
    });
  }
  if (metrics.secondaryAngle !== undefined) {
    rows.push({
      label: "Angle 2",
      value: `${metrics.secondaryAngle.toFixed(0)}°`,
      color: "text-neon-cyan",
    });
  }
  if (exercise === "plank" && metrics.duration !== undefined) {
    rows.push({
      label: "Timer",
      value: `${Math.floor(metrics.duration)}s`,
      color: "text-neon-purple",
    });
  }

  return (
    <div className="trainer-panel pointer-events-none w-full p-3">
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-neon-cyan/70">
        Precision
      </p>
      <div className="space-y-1.5">
        {rows.length > 0 ? (
          rows.map((row) => (
            <MetricRow
              key={row.label}
              label={row.label}
              value={row.value}
              color={row.color}
            />
          ))
        ) : (
          <p className="text-xs text-slate-500">Tracking…</p>
        )}
      </div>
    </div>
  );
}
