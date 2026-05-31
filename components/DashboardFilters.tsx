"use client";

import type { AnalyticsRange } from "@/lib/api";

interface DashboardFiltersProps {
  range: AnalyticsRange;
  exerciseType: string | null;
  exerciseOptions: { value: string; label: string }[];
  onRangeChange: (range: AnalyticsRange) => void;
  onExerciseChange: (exercise: string | null) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

export default function DashboardFilters({
  range,
  exerciseType,
  exerciseOptions,
  onRangeChange,
  onExerciseChange,
  onRefresh,
  loading = false,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onRangeChange(opt.value)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              range === opt.value
                ? "bg-neon-cyan/20 text-neon-cyan ring-1 ring-neon-cyan/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={exerciseType ?? ""}
          onChange={(e) => onExerciseChange(e.target.value || null)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-neon-purple/40"
        >
          <option value="">All exercises</option>
          {exerciseOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="btn-secondary px-3 py-2 text-xs disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
