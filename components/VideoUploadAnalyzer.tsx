"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVideoPoseAnalysis } from "@/hooks/useVideoPoseAnalysis";
import { useMLAssist } from "@/hooks/useMLAssist";
import MLAssistPanel from "@/components/MLAssistPanel";
import ErrorState from "@/components/ErrorState";
import SafetyDisclaimer from "@/components/SafetyDisclaimer";
import { getExerciseDef } from "@/lib/exerciseRegistry";
import {
  VIDEO_ACCEPT,
  validateVideoFile,
  videoReportToSessionSummary,
} from "@/lib/videoAnalysisUtils";
import type { AnalyzableExerciseType, SessionSummaryData } from "@/types/fitness";
import type { User } from "@/lib/api";
import VideoAnalysisReportView from "@/components/VideoAnalysisReport";

const VIDEO_EXERCISES: AnalyzableExerciseType[] = [
  "pushup",
  "squat",
  "plank",
  "bicep_curl",
  "lunge",
  "shoulder_press",
  "lateral_raise",
  "deadlift",
  "high_knee",
];

interface VideoUploadAnalyzerProps {
  user: User | null;
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onSaveReport: (summary: SessionSummaryData) => Promise<unknown>;
  saving?: boolean;
}

export default function VideoUploadAnalyzer({
  user,
  isAuthenticated,
  onLoginClick,
  onSaveReport,
  saving = false,
}: VideoUploadAnalyzerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [exercise, setExercise] = useState<AnalyzableExerciseType>("squat");
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { status, progress, error, report, analyzeVideo, reset, abort } =
    useVideoPoseAnalysis();

  const {
    mlAssistEnabled,
    setMlAssistEnabled,
    lastMLMeta,
    setLastMLMeta,
  } = useMLAssist();

  useEffect(() => {
    setLastMLMeta(null);
  }, [report, setLastMLMeta]);

  const isBusy = status === "loading_model" || status === "analyzing";

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      abort();
      revokeObjectUrl();
    };
  }, [abort, revokeObjectUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    setSaveSuccess(false);
    setSaveError(null);
    reset();
    revokeObjectUrl();
    setPreviewUrl(null);
    setVideoReady(false);
    setFileName(null);

    if (!file) return;

    const validationError = validateVideoFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    setFileName(file.name);
  };

  const handleVideoLoaded = () => {
    setVideoReady(true);
  };

  const handleAnalyze = async () => {
    const video = videoRef.current;
    if (!video || !videoReady) return;
    setSaveSuccess(false);
    setSaveError(null);
    const result = await analyzeVideo(video, exercise, mlAssistEnabled);
    if (result?.lastMlMeta) setLastMLMeta(result.lastMlMeta);
  };

  const handleNewAnalysis = () => {
    abort();
    reset();
    revokeObjectUrl();
    setPreviewUrl(null);
    setFileName(null);
    setVideoReady(false);
    setSaveSuccess(false);
    setSaveError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!report) return;
    setSaveError(null);
    try {
      await onSaveReport(videoReportToSessionSummary(report));
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save report");
    }
  };

  const displayError = fileError || error;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-black to-slate-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:pb-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-xl font-black text-white sm:text-2xl">
              Video<span className="text-neon-purple"> Analysis</span>
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              Upload a workout clip — analyzed locally in your browser
            </p>
          </div>

          <SafetyDisclaimer compact />

          {status !== "complete" && (
            <>
              <div className="glass-card border border-white/10 p-6">
                <h2 className="mb-4 text-sm font-bold text-white">Upload Workout Video</h2>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={VIDEO_ACCEPT}
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/5 py-10 transition hover:border-neon-purple/40 hover:bg-neon-purple/5 disabled:opacity-50"
                >
                  <span className="text-3xl">🎬</span>
                  <span className="mt-2 text-sm font-semibold text-white">
                    {fileName ?? "Choose MP4, MOV, or WebM"}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">Max 100MB · processed on device</span>
                </button>

                {displayError && (
                  <div className="mt-3">
                    <ErrorState
                      title={
                        displayError.includes("pose")
                          ? "No pose detected"
                          : displayError.includes("format")
                            ? "Upload error"
                            : "Analysis error"
                      }
                      message={displayError}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                    Exercise type
                  </label>
                  <select
                    value={exercise}
                    onChange={(e) =>
                      setExercise(e.target.value as AnalyzableExerciseType)
                    }
                    disabled={isBusy}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-neon-purple/40"
                  >
                    {VIDEO_EXERCISES.map((ex) => (
                      <option key={ex} value={ex}>
                        {getExerciseDef(ex).icon} {getExerciseDef(ex).label}
                      </option>
                    ))}
                  </select>
                </div>

                {previewUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      className="aspect-video w-full bg-black object-contain"
                      controls
                      playsInline
                      muted
                      onLoadedMetadata={handleVideoLoaded}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <MLAssistPanel
                    enabled={mlAssistEnabled}
                    onToggle={setMlAssistEnabled}
                    lastMeta={lastMLMeta}
                    datasetCollectorOpen={false}
                    showDatasetButton={false}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!videoReady || isBusy}
                  className="btn-primary mt-4 w-full py-3 disabled:opacity-50"
                >
                  {status === "loading_model"
                    ? "Loading AI model…"
                    : status === "analyzing"
                      ? `Analyzing… ${progress}%`
                      : "Analyze Video"}
                </button>

                {isBusy && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                      <span>
                        {status === "loading_model"
                          ? "Preparing pose model"
                          : "Scanning frames"}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all duration-300"
                        style={{ width: `${Math.max(progress, status === "loading_model" ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-slate-500">
                {user
                  ? `Signed in as ${user.full_name || user.email}`
                  : "Sign in after analysis to save your report to history"}
              </p>
            </>
          )}

          {status === "complete" && report && (
            <VideoAnalysisReportView
              report={report}
              isAuthenticated={isAuthenticated}
              saving={saving}
              saveSuccess={saveSuccess}
              saveError={saveError}
              onSave={handleSave}
              onLoginClick={onLoginClick}
              onNewAnalysis={handleNewAnalysis}
            />
          )}
        </div>
      </div>
    </div>
  );
}
