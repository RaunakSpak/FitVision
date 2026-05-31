"use client";

import { useCallback, useState } from "react";
import {
  sessionSummaryToPayload,
  workoutApi,
  type WorkoutCreatePayload,
  type WorkoutRecord,
} from "@/lib/api";
import type { SessionSummaryData } from "@/types/fitness";

export function useWorkoutHistory() {
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workoutApi.list();
      setWorkouts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveWorkout = useCallback(async (summary: SessionSummaryData) => {
    setSaving(true);
    setError(null);
    try {
      const payload = sessionSummaryToPayload(summary);
      const saved = await workoutApi.create(payload);
      setWorkouts((prev) => [saved, ...prev]);
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save workout";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const savePayload = useCallback(async (payload: WorkoutCreatePayload) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await workoutApi.create(payload);
      setWorkouts((prev) => [saved, ...prev]);
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save workout");
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteWorkout = useCallback(async (id: number) => {
    setError(null);
    try {
      await workoutApi.delete(id);
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workout");
      throw err;
    }
  }, []);

  return {
    workouts,
    loading,
    saving,
    error,
    fetchWorkouts,
    saveWorkout,
    savePayload,
    deleteWorkout,
    clearError: () => setError(null),
  };
}
