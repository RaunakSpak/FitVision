"use client";

import { useBackendHealth } from "@/hooks/useBackendHealth";

export default function BackendStatusBanner() {
  const { isOnline, checking, recheck } = useBackendHealth();

  if (checking || isOnline) return null;

  return (
    <div
      className="relative z-[70] border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 backdrop-blur-sm"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-amber-200">
          <span className="font-semibold">Backend is offline.</span> Please start
          the API server. Live trainer and video analysis still work locally; sign
          in, save workouts, and dashboard need the backend.
        </p>
        <button
          type="button"
          onClick={() => void recheck()}
          className="shrink-0 rounded-lg border border-amber-500/40 bg-black/30 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-black/50"
        >
          Retry connection
        </button>
      </div>
    </div>
  );
}
