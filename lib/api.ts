import type { SessionSummaryData } from "@/types/fitness";

/** Same-origin `/api` via Next.js rewrite — keeps auth cookies on localhost:3000 */
export const API_BASE = "";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
}

export interface WorkoutRecord {
  id: number;
  exercise_type: string;
  exercise_label: string | null;
  total_reps: number;
  good_reps: number;
  bad_reps: number;
  form_score: number;
  duration_seconds: number;
  best_plank_hold_seconds: number;
  mistakes: { id: string; label: string; count: number }[] | null;
  grade: string;
  gym_log: unknown[] | null;
  created_at: string;
}

export interface WorkoutCreatePayload {
  exercise_type: string;
  exercise_label?: string | null;
  total_reps: number;
  good_reps: number;
  bad_reps: number;
  form_score: number;
  duration_seconds: number;
  best_plank_hold_seconds: number;
  mistakes: { id: string; label: string; count: number }[] | null;
  grade: string;
  gym_log?: unknown[] | null;
}

export type AnalyticsRange = "7d" | "30d" | "all";

export interface ScoreOverTimePoint {
  date: string;
  score: number;
}

export interface RepsOverTimePoint {
  date: string;
  reps: number;
}

export interface ExerciseDistributionItem {
  exercise: string;
  label: string;
  count: number;
}

export interface MistakeFrequencyItem {
  mistake: string;
  label: string;
  count: number;
}

export interface WeeklyDurationItem {
  week: string;
  minutes: number;
}

export interface InsightItem {
  type: string;
  message: string;
  tone: "positive" | "warning" | "neutral" | string;
}

export interface WorkoutAnalytics {
  total_workouts: number;
  total_reps: number;
  average_form_score: number;
  best_form_score: number;
  current_streak: number;
  best_exercise: string | null;
  most_common_mistake: string | null;
  total_duration_seconds: number;
  score_over_time: ScoreOverTimePoint[];
  reps_over_time: RepsOverTimePoint[];
  exercise_distribution: ExerciseDistributionItem[];
  mistakes_frequency: MistakeFrequencyItem[];
  weekly_duration: WeeklyDurationItem[];
  insights: InsightItem[];
}

export interface AnalyticsParams {
  range?: AnalyticsRange;
  exercise_type?: string | null;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "Backend is offline. Please start the API server.",
      0
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail
              .map((d: { msg?: string; loc?: string[] }) =>
                d.msg ?? JSON.stringify(d)
              )
              .join(", ")
          : res.status === 401
            ? "Invalid email or password"
            : "Request failed";
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export function sessionSummaryToPayload(
  summary: SessionSummaryData
): WorkoutCreatePayload {
  return {
    exercise_type: summary.exercise,
    exercise_label: summary.exerciseLabel,
    total_reps: summary.totalReps,
    good_reps: summary.goodReps,
    bad_reps: summary.badReps,
    form_score: summary.formScore,
    duration_seconds: summary.durationSeconds,
    best_plank_hold_seconds: Math.floor(summary.bestPlankHold),
    mistakes: summary.topMistakes.length ? summary.topMistakes : null,
    grade: summary.grade,
    gym_log: summary.gymLog.length ? summary.gymLog : null,
  };
}

export { videoReportToSessionSummary } from "@/lib/videoAnalysisUtils";

export const authApi = {
  me: () => apiFetch<User>("/api/auth/me"),
  register: (email: string, password: string, fullName?: string) =>
    apiFetch<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: fullName || null }),
    }),
  login: (email: string, password: string) =>
    apiFetch<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    apiFetch<{ message: string }>("/api/auth/logout", { method: "POST" }),
};

export const workoutApi = {
  list: () => apiFetch<WorkoutRecord[]>("/api/workouts"),
  get: (id: number) => apiFetch<WorkoutRecord>(`/api/workouts/${id}`),
  create: (payload: WorkoutCreatePayload) =>
    apiFetch<WorkoutRecord>("/api/workouts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  delete: (id: number) =>
    apiFetch<void>(`/api/workouts/${id}`, { method: "DELETE" }),
  analytics: (params: AnalyticsParams = {}) => {
    const search = new URLSearchParams();
    if (params.range) search.set("range", params.range);
    if (params.exercise_type) search.set("exercise_type", params.exercise_type);
    const qs = search.toString();
    return apiFetch<WorkoutAnalytics>(
      `/api/workouts/analytics${qs ? `?${qs}` : ""}`
    );
  },
};

export { ApiError };

export interface HealthResponse {
  status: string;
  service: string;
}

export const healthApi = {
  check: () => apiFetch<HealthResponse>("/api/health"),
};
