"use client";

import DashboardFilters from "@/components/DashboardFilters";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import InsightCards from "@/components/InsightCards";
import LoadingState from "@/components/LoadingState";
import MetricCard from "@/components/MetricCard";
import ProgressCharts from "@/components/ProgressCharts";
import SafetyDisclaimer from "@/components/SafetyDisclaimer";
import { useWorkoutAnalytics } from "@/hooks/useWorkoutAnalytics";
import { formatDuration } from "@/lib/poseUtils";
import type { User } from "@/lib/api";

const EXERCISE_FILTER_OPTIONS = [
  { value: "pushup", label: "Push-up" },
  { value: "squat", label: "Squat" },
  { value: "plank", label: "Plank" },
  { value: "bicep_curl", label: "Bicep Curl" },
  { value: "lunge", label: "Lunge" },
  { value: "shoulder_press", label: "Shoulder Press" },
  { value: "lateral_raise", label: "Lateral Raise" },
  { value: "deadlift", label: "Deadlift" },
  { value: "high_knee", label: "High Knee" },
  { value: "auto_detect", label: "Gym AI" },
];

interface DashboardProps {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  onLoginClick: () => void;
}

export default function Dashboard({
  user,
  isAuthenticated,
  authLoading,
  onLoginClick,
}: DashboardProps) {
  const {
    analytics,
    loading,
    error,
    range,
    exerciseType,
    setRange,
    setExerciseType,
    fetchAnalytics,
  } = useWorkoutAnalytics(isAuthenticated);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-black to-slate-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:pb-6 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-xl font-black text-white sm:text-2xl">
              Progress<span className="text-neon-cyan"> Dashboard</span>
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              {user
                ? `Welcome back, ${user.full_name || user.email}`
                : "Sign in to sync your workout analytics"}
            </p>
          </div>

          {authLoading && <LoadingState message="Loading account…" fullScreen />}

          {!authLoading && !isAuthenticated && (
            <EmptyState
              icon="📊"
              title="Sign in to view progress"
              description="Save workouts from the live trainer or video analysis to unlock charts, streaks, and AI insights."
              actionLabel="Sign In"
              onAction={onLoginClick}
            />
          )}

          {!authLoading && isAuthenticated && (
            <>
              <DashboardFilters
                range={range}
                exerciseType={exerciseType}
                exerciseOptions={EXERCISE_FILTER_OPTIONS}
                onRangeChange={setRange}
                onExerciseChange={setExerciseType}
                onRefresh={() => fetchAnalytics()}
                loading={loading}
              />

              {error && (
                <ErrorState
                  title="Could not load analytics"
                  message={error}
                  variant={error.includes("reach the API") ? "offline" : "error"}
                  hint={
                    error.includes("reach the API")
                      ? "Start the backend: cd backend && uvicorn app.main:app --reload --port 8001"
                      : undefined
                  }
                  actionLabel="Retry"
                  onAction={() => fetchAnalytics()}
                />
              )}

              {loading && !analytics && <LoadingState message="Loading analytics…" />}

              {analytics && analytics.total_workouts === 0 && !loading && (
                <EmptyState
                  icon="🏋️"
                  title="No workouts yet"
                  description="Complete a session and save it to history. Your charts and insights will appear here."
                />
              )}

              {analytics && analytics.total_workouts > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <MetricCard label="Total Workouts" value={analytics.total_workouts} icon="📋" accent="cyan" />
                    <MetricCard label="Total Reps" value={analytics.total_reps} icon="🔁" accent="purple" />
                    <MetricCard label="Avg Form Score" value={analytics.average_form_score} subtext="/ 100" icon="◎" accent="green" />
                    <MetricCard label="Best Form Score" value={analytics.best_form_score} subtext="/ 100" icon="★" accent="green" />
                    <MetricCard label="Current Streak" value={`${analytics.current_streak}d`} subtext="consecutive days" icon="🔥" accent="pink" />
                    <MetricCard label="Best Exercise" value={analytics.best_exercise ?? "—"} icon="💪" accent="cyan" />
                    <MetricCard label="Top Mistake" value={analytics.most_common_mistake ?? "None"} icon="⚠" accent="pink" />
                    <MetricCard label="Total Duration" value={formatDuration(analytics.total_duration_seconds)} icon="⏱" accent="purple" />
                  </div>

                  <InsightCards insights={analytics.insights} />
                  <ProgressCharts analytics={analytics} />
                </>
              )}

              <SafetyDisclaimer compact />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
