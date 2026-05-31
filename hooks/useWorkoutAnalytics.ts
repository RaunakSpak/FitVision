"use client";

import { useCallback, useEffect, useState } from "react";
import {
  workoutApi,
  type AnalyticsParams,
  type AnalyticsRange,
  type WorkoutAnalytics,
} from "@/lib/api";

export function useWorkoutAnalytics(isAuthenticated: boolean) {
  const [analytics, setAnalytics] = useState<WorkoutAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [exerciseType, setExerciseType] = useState<string | null>(null);

  const fetchAnalytics = useCallback(
    async (overrides?: Partial<AnalyticsParams>) => {
      if (!isAuthenticated) {
        setAnalytics(null);
        return;
      }

      const params: AnalyticsParams = {
        range: overrides?.range ?? range,
        exercise_type:
          overrides?.exercise_type !== undefined
            ? overrides.exercise_type
            : exerciseType,
      };

      setLoading(true);
      setError(null);
      try {
        const data = await workoutApi.analytics(params);
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, range, exerciseType]
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    } else {
      setAnalytics(null);
    }
  }, [isAuthenticated, range, exerciseType, fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    range,
    exerciseType,
    setRange,
    setExerciseType,
    fetchAnalytics,
    clearError: () => setError(null),
  };
}
