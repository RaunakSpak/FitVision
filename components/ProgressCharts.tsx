"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WorkoutAnalytics } from "@/lib/api";

interface ProgressChartsProps {
  analytics: WorkoutAnalytics;
}

const CHART_COLORS = ["#00f5ff", "#8338ec", "#39ff14", "#ff006e", "#fbbf24", "#60a5fa"];

const tooltipStyle = {
  contentStyle: {
    background: "rgba(0,0,0,0.85)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    fontSize: "12px",
  },
  labelStyle: { color: "#94a3b8" },
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartShell({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="glass-card border border-white/10 p-4">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      {empty ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-500">
          No data for this period
        </div>
      ) : (
        <div className="h-52 sm:h-56">{children}</div>
      )}
    </div>
  );
}

export default function ProgressCharts({ analytics }: ProgressChartsProps) {
  const scoreData = analytics.score_over_time.map((p) => ({
    ...p,
    label: formatShortDate(p.date),
  }));
  const repsData = analytics.reps_over_time.map((p) => ({
    ...p,
    label: formatShortDate(p.date),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartShell title="Form Score Over Time" empty={scoreData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scoreData}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip {...tooltipStyle} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#00f5ff"
              strokeWidth={2}
              dot={{ fill: "#00f5ff", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Reps Over Time" empty={repsData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={repsData}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="reps" fill="#8338ec" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        title="Exercise Distribution"
        empty={analytics.exercise_distribution.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={analytics.exercise_distribution}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
            >
              {analytics.exercise_distribution.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        title="Mistakes Frequency"
        empty={analytics.mistakes_frequency.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={analytics.mistakes_frequency}
            layout="vertical"
            margin={{ left: 8 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              tick={{ fill: "#94a3b8", fontSize: 9 }}
            />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" fill="#ff006e" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <div className="lg:col-span-2">
        <ChartShell
          title="Weekly Workout Duration (minutes)"
          empty={analytics.weekly_duration.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.weekly_duration}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="minutes" fill="#39ff14" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  );
}
