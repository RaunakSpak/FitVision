"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { drawSkeleton, extractPoseLandmarks } from "@/lib/poseUtils";
import { createExerciseAnalyzer } from "@/lib/exerciseAnalyzer";
import { useVoiceCoach } from "@/hooks/useVoiceCoach";
import { getExerciseDef } from "@/lib/exerciseRegistry";
import type {
  AnalyzableExerciseType,
  AnalyzerMetrics,
  ExerciseStats,
  ExerciseType,
  GymExerciseLogEntry,
  SessionSummaryData,
  WorkoutStatus,
  WorkoutSuggestion,
} from "@/types/fitness";
import {
  getExerciseStartMessage,
  initialStatsFor,
} from "@/types/fitness";
import FeedbackPanel from "@/components/FeedbackPanel";
import StatsPanel from "@/components/StatsPanel";
import MetricsPanel from "@/components/MetricsPanel";
import ExerciseSelector from "@/components/ExerciseSelector";
import WorkoutControls from "@/components/WorkoutControls";
import SessionSummary from "@/components/SessionSummary";
import WorkoutSuggestions from "@/components/WorkoutSuggestions";
import MLAssistPanel from "@/components/MLAssistPanel";
import ErrorState from "@/components/ErrorState";
import { useMLAssist } from "@/hooks/useMLAssist";
import type { HybridAnalyzerResult } from "@/types/fitness";
import {
  acquireCameraStream,
  attachStreamToVideo,
  formatCameraError,
  stopMediaStream,
  type CameraErrorInfo,
} from "@/lib/cameraUtils";

interface CameraTrainerProps {
  isAuthenticated?: boolean;
  savingWorkout?: boolean;
  autoStartCamera?: boolean;
  onAutoStartHandled?: () => void;
  onLoginClick?: () => void;
  onSaveWorkout?: (summary: SessionSummaryData) => Promise<unknown>;
}

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

function initialStatsForMode(exercise: ExerciseType): ExerciseStats {
  if (exercise === "auto_detect") return initialStatsFor("squat");
  return initialStatsFor(exercise);
}

const VOICE_WORTHY = new Set([
  "Great form",
  "Great plank",
  "Good rep counted",
  "Good squat counted",
  "Good curl counted",
  "Good lunge counted",
  "Good press counted",
  "Good raise counted",
  "Lower your chest more",
  "Straighten your body line",
  "Keep your hips aligned",
  "Don't drop your hips",
  "Go deeper",
  "Keep your knees aligned",
  "Keep chest up",
  "Keep your body straight",
  "Curl higher",
  "Keep elbow stable",
  "Fully extend your arm",
]);

export default function CameraTrainer({
  isAuthenticated = false,
  savingWorkout = false,
  autoStartCamera = false,
  onAutoStartHandled,
  onLoginClick,
  onSaveWorkout,
}: CameraTrainerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const analyzerRef = useRef(createExerciseAnalyzer());
  const animationRef = useRef<number>(0);
  const exerciseRef = useRef<ExerciseType>("auto_detect");
  const workoutStatusRef = useRef<WorkoutStatus>("idle");
  const lastFeedbackRef = useRef("");
  const startingCameraRef = useRef(false);
  const autoStartRanRef = useRef(false);
  const mountedRef = useRef(true);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CameraErrorInfo | null>(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [exercise, setExercise] = useState<ExerciseType>("auto_detect");
  const [detectedExercise, setDetectedExercise] = useState<AnalyzableExerciseType>("squat");
  const [workoutStatus, setWorkoutStatus] = useState<WorkoutStatus>("idle");
  const [stats, setStats] = useState<ExerciseStats>(initialStatsFor("squat"));
  const [feedback, setFeedback] = useState("Press Start to begin your workout");
  const [isGoodForm, setIsGoodForm] = useState(true);
  const [metrics, setMetrics] = useState<AnalyzerMetrics>({});
  const [sessionDuration, setSessionDuration] = useState(0);
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [gymLog, setGymLog] = useState<GymExerciseLogEntry[]>([]);
  const [topMistakes, setTopMistakes] = useState<
    { id: string; label: string; count: number }[]
  >([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    mlAssistEnabled,
    setMlAssistEnabled,
    lastMLMeta,
    setLastMLMeta,
  } = useMLAssist();

  useEffect(() => {
    analyzerRef.current.setMLEnabled(mlAssistEnabled);
  }, [mlAssistEnabled]);

  const { speak, isMuted, toggleMute, cancelSpeech } = useVoiceCoach();
  const isAutoDetect = exercise === "auto_detect";
  const displayDef = isAutoDetect
    ? getExerciseDef(detectedExercise)
    : getExerciseDef(exercise as AnalyzableExerciseType);
  const workoutActive = workoutStatus === "active";
  const live = poseDetected && isCameraActive && workoutActive;

  const syncWorkoutStatus = useCallback((status: WorkoutStatus) => {
    workoutStatusRef.current = status;
    setWorkoutStatus(status);
  }, []);

  const resetExerciseState = useCallback(
    (ex: ExerciseType, keepSession = false) => {
      analyzerRef.current.setExercise(ex);
      if (!keepSession) {
        analyzerRef.current.getSession().reset();
        syncWorkoutStatus("idle");
      }
      analyzerRef.current.resetCurrent();
      setStats(initialStatsFor(analyzerRef.current.getActiveExercise()));
      setFeedback(
        keepSession && workoutStatusRef.current === "paused"
          ? "Workout paused"
          : getExerciseStartMessage(ex)
      );
      setIsGoodForm(true);
      setMetrics({});
      setTopMistakes([]);
      setSessionDuration(0);
      lastFeedbackRef.current = "";
    },
    [syncWorkoutStatus]
  );

  const handleExerciseChange = useCallback(
    (next: ExerciseType) => {
      if (next === exercise) return;
      exerciseRef.current = next;
      setExercise(next);
      resetExerciseState(next);
    },
    [exercise, resetExerciseState]
  );

  const handleVoiceFeedback = useCallback(
    (message: string, repCompleted?: boolean) => {
      if (workoutStatusRef.current !== "active") return;
      const isImportant =
        repCompleted ||
        VOICE_WORTHY.has(message) ||
        !message.includes("Great");
      if (isImportant) {
        speak(message, repCompleted);
      }
    },
    [speak]
  );

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animationRef.current);
    cancelSpeech();
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    setPoseDetected(false);
    analyzerRef.current.resetAll();
    syncWorkoutStatus("idle");
    setSummary(null);
    setFeedback("Press Start to begin your workout");
  }, [cancelSpeech, syncWorkoutStatus]);

  const initPoseLandmarker = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    const baseOptions = { modelAssetPath: MODEL_URL };
    const options = {
      runningMode: "VIDEO" as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    try {
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: "GPU" },
        ...options,
      });
    } catch {
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: "CPU" },
        ...options,
      });
    }
  }, []);

  const detectPose = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const landmarker = poseLandmarkerRef.current;

    if (!video || !overlay || !landmarker || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    overlay.width = width;
    overlay.height = height;
    const ctx = overlay.getContext("2d");
    if (!ctx) {
      animationRef.current = requestAnimationFrame(detectPose);
      return;
    }

    const timestamp = performance.now();
    const results = landmarker.detectForVideo(video, timestamp);
    const status = workoutStatusRef.current;

    if (results.landmarks?.length) {
      const rawLandmarks = results.landmarks[0];
      setPoseDetected(true);
      const poseLandmarks = extractPoseLandmarks(rawLandmarks);

      if (poseLandmarks) {
        let goodForm = true;

        if (status === "active") {
          const result: HybridAnalyzerResult | null = analyzerRef.current.analyze(
            poseLandmarks,
            timestamp
          );

          if (result) {
            if (result.mlAssist) setLastMLMeta(result.mlAssist);
            setStats(analyzerRef.current.getStats());
            setFeedback(result.feedback);
            setIsGoodForm(result.isGoodForm);
            setMetrics(result.metrics);
            setTopMistakes(analyzerRef.current.getMistakes().getTop(3));
            setSessionDuration(analyzerRef.current.getSession().getDurationSeconds());
            setDetectedExercise(analyzerRef.current.getActiveExercise());
            setSuggestions(analyzerRef.current.getSuggestions());
            setGymLog(analyzerRef.current.getGymSession().getLog());
            goodForm = result.isGoodForm;

            if (
              result.feedback !== lastFeedbackRef.current ||
              result.repCompleted
            ) {
              handleVoiceFeedback(result.feedback, result.repCompleted);
              lastFeedbackRef.current = result.feedback;
            }
          } else {
            drawSkeleton(ctx, rawLandmarks, width, height, true);
            setFeedback("Move into frame — landmarks not visible");
            setIsGoodForm(true);
            animationRef.current = requestAnimationFrame(detectPose);
            return;
          }
        } else if (status === "paused") {
          setFeedback("Workout paused");
          drawSkeleton(ctx, rawLandmarks, width, height, true);
          animationRef.current = requestAnimationFrame(detectPose);
          return;
        } else {
          setFeedback("Ready — press Start Workout");
          drawSkeleton(ctx, rawLandmarks, width, height, true);
          animationRef.current = requestAnimationFrame(detectPose);
          return;
        }

        drawSkeleton(ctx, rawLandmarks, width, height, goodForm);
      } else {
        ctx.clearRect(0, 0, width, height);
        setFeedback("Adjust position — move into frame");
        setIsGoodForm(true);
      }
    } else {
      setPoseDetected(false);
      ctx.clearRect(0, 0, width, height);
      setFeedback(
        status === "active"
          ? "No pose detected — step into frame"
          : status === "paused"
            ? "Workout paused"
            : "No pose detected — step into frame"
      );
    }

    animationRef.current = requestAnimationFrame(detectPose);
  }, [handleVoiceFeedback, setLastMLMeta]);

  const startCamera = useCallback(async () => {
    if (startingCameraRef.current) return;

    startingCameraRef.current = true;
    setError(null);
    setIsLoading(true);
    cancelAnimationFrame(animationRef.current);

    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    analyzerRef.current.resetAll();
    analyzerRef.current.setExercise(exerciseRef.current);
    setStats(initialStatsForMode(exerciseRef.current));
    syncWorkoutStatus("idle");
    setSummary(null);
    setSuggestions([]);
    setGymLog([]);
    setFeedback("Connecting to camera…");

    let stream: MediaStream | null = null;

    try {
      stream = await acquireCameraStream();
      if (!mountedRef.current) {
        stopMediaStream(stream);
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element not available");

      await attachStreamToVideo(video, stream);
      if (!mountedRef.current) return;

      setFeedback("Loading AI model…");
      if (!poseLandmarkerRef.current) await initPoseLandmarker();
      if (!mountedRef.current) return;

      setIsCameraActive(true);
      setFeedback("Ready — press Start Workout");
      animationRef.current = requestAnimationFrame(detectPose);
    } catch (err) {
      stopMediaStream(stream);
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsCameraActive(false);
      if (mountedRef.current) {
        setError(formatCameraError(err));
      }
    } finally {
      startingCameraRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [detectPose, initPoseLandmarker, syncWorkoutStatus]);

  const handleStartWorkout = () => {
    analyzerRef.current.startWorkout();
    syncWorkoutStatus("active");
    setFeedback(getExerciseStartMessage(exerciseRef.current));
    lastFeedbackRef.current = "";
    speak("Workout started", true);
  };

  const handlePauseWorkout = () => {
    analyzerRef.current.pauseWorkout();
    syncWorkoutStatus("paused");
    setFeedback("Workout paused");
    cancelSpeech();
  };

  const handleResumeWorkout = () => {
    analyzerRef.current.resumeWorkout();
    syncWorkoutStatus("active");
    setFeedback(getExerciseStartMessage(exerciseRef.current));
    speak("Workout resumed", true);
  };

  const handleEndWorkout = () => {
    const data = analyzerRef.current.endWorkout();
    syncWorkoutStatus("ended");
    setSummary(data);
    setFeedback("Workout complete — great effort!");
    cancelSpeech();
    speak(`Workout complete. Grade ${data.grade}`, true);
  };

  const handleReset = () => {
    cancelSpeech();
    analyzerRef.current.resetAll();
    analyzerRef.current.setExercise(exerciseRef.current);
    syncWorkoutStatus("idle");
    setStats(initialStatsFor(analyzerRef.current.getActiveExercise()));
    setSummary(null);
    setTopMistakes([]);
    setSuggestions([]);
    setGymLog([]);
    setSessionDuration(0);
    setFeedback(
      isCameraActive
        ? "Ready — press Start Workout"
        : "Press Start to begin your workout"
    );
    lastFeedbackRef.current = "";
  };

  const handleNewWorkout = () => {
    setSummary(null);
    handleReset();
  };

  const handleTrySuggestion = (ex: string) => {
    setSummary(null);
    handleExerciseChange(ex as ExerciseType);
    syncWorkoutStatus("idle");
    setFeedback(getExerciseStartMessage(ex as ExerciseType));
  };

  const handleSaveWorkout = async () => {
    if (!summary || !onSaveWorkout) return;
    setSaveError(null);
    try {
      await onSaveWorkout(summary);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save workout");
    }
  };

  useEffect(() => {
    if (summary) {
      setSaveSuccess(false);
      setSaveError(null);
    }
  }, [summary]);

  useEffect(() => {
    exerciseRef.current = exercise;
  }, [exercise]);

  useEffect(() => {
    if (workoutStatus !== "active") return;
    const interval = setInterval(() => {
      setSessionDuration(analyzerRef.current.getSession().getDurationSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [workoutStatus]);

  useEffect(() => {
    if (!autoStartCamera || autoStartRanRef.current || isCameraActive || isLoading) return;
    autoStartRanRef.current = true;
    void startCamera().finally(() => onAutoStartHandled?.());
  }, [autoStartCamera, isCameraActive, isLoading, startCamera, onAutoStartHandled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
      poseLandmarkerRef.current?.close();
      poseLandmarkerRef.current = null;
    };
  }, [stopCamera]);

  const statusLabel =
    workoutStatus === "active"
      ? "Active"
      : workoutStatus === "paused"
        ? "Paused"
        : workoutStatus === "ended"
          ? "Ended"
          : "Ready";

  const statusColor =
    workoutStatus === "active"
      ? "text-neon-green"
      : workoutStatus === "paused"
        ? "text-neon-purple"
        : workoutStatus === "ended"
          ? "text-neon-pink"
          : "text-slate-400";

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        playsInline
        muted
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover"
      />

      {!isCameraActive && !isLoading && (
        <div className="absolute inset-0 flex bg-black/80 backdrop-blur-sm">
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <h1 className="mb-2 bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
              Live Trainer
            </h1>
            <p className="mb-2 max-w-sm text-center text-sm text-slate-400">
              No account needed — allow camera access to start
            </p>
            <p className="mb-8 max-w-xs text-center text-xs text-slate-500">
              Gym AI detects your movement and suggests what to train next
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
            >
              Allow Camera &amp; Start
            </button>
          </div>
          <div className="trainer-side-rail pointer-events-auto right-0 top-0 hidden h-full w-[min(100%,280px)] border-l border-white/5 bg-black/40 sm:flex">
            <ExerciseSelector
              selected={exercise}
              onSelect={handleExerciseChange}
              layout="sidebar"
            />
          </div>
          <div className="pointer-events-auto absolute inset-x-0 bottom-20 px-3 sm:hidden">
            <ExerciseSelector selected={exercise} onSelect={handleExerciseChange} compact />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-neon-cyan border-t-transparent" />
          <p className="mt-4 text-sm text-neon-cyan">Loading AI model…</p>
        </div>
      )}

      {isCameraActive && (
        <div
          className="trainer-vignette pointer-events-none absolute inset-0 z-10"
          aria-hidden
        />
      )}

      {isCameraActive && (
        <>
          {/* Left rail — coach feedback & live stats */}
          <div className="trainer-side-rail left-0 top-0 max-h-full w-[min(46vw,240px)] overflow-y-auto sm:w-[min(38vw,260px)]">
            <div className="pointer-events-auto flex flex-col gap-2">
              <div className="trainer-panel flex flex-wrap items-center gap-2 px-2.5 py-2">
                <span className="flex items-center gap-1.5 rounded-full bg-neon-green/15 px-2 py-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-75" />
                    <span className="relative h-2 w-2 rounded-full bg-neon-green" />
                  </span>
                  <span className="text-[10px] font-bold uppercase text-neon-green">Live</span>
                </span>
                <span className={`text-[10px] font-bold uppercase ${statusColor}`}>
                  {statusLabel}
                </span>
                {workoutActive && (
                  <span className="text-[10px] tabular-nums text-slate-400">
                    {Math.floor(sessionDuration / 60)}:
                    {(sessionDuration % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>

              <FeedbackPanel
                exercise={exercise}
                feedback={feedback}
                isGoodForm={isGoodForm}
                poseDetected={live || (poseDetected && workoutStatus === "paused")}
                formScore={workoutActive ? stats.formScore : undefined}
                metrics={metrics}
                workoutStatus={workoutStatus}
                variant="side"
              />

              {workoutActive && (
                <StatsPanel
                  exercise={exercise}
                  stats={stats}
                  metrics={metrics}
                  topMistakes={topMistakes}
                />
              )}
            </div>
          </div>

          {/* Right rail — controls, exercises, ML */}
          <div className="trainer-side-rail right-0 top-0 max-h-full w-[min(46vw,260px)] overflow-y-auto sm:w-[min(40vw,280px)]">
            <div className="pointer-events-auto flex flex-col gap-2">
              <MLAssistPanel
                enabled={mlAssistEnabled}
                onToggle={setMlAssistEnabled}
                lastMeta={lastMLMeta}
                datasetCollectorOpen={false}
                showDatasetButton={false}
              />

              <div className="trainer-panel px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">
                  {isAutoDetect ? "Detected" : "Exercise"}
                </p>
                <p className="text-sm font-bold text-white">
                  {displayDef.icon} {displayDef.label}
                </p>
                {isAutoDetect && (
                  <p className="text-[9px] text-neon-cyan">Gym AI mode</p>
                )}
              </div>

              {workoutActive && (
                <WorkoutSuggestions
                  suggestions={suggestions}
                  gymLog={gymLog}
                  detectedExercise={detectedExercise}
                  isAutoDetect={isAutoDetect}
                  onSelectExercise={handleExerciseChange}
                />
              )}

              {workoutActive && (
                <MetricsPanel
                  exercise={exercise}
                  metrics={metrics}
                  poseDetected={live}
                />
              )}

              <WorkoutControls
                workoutStatus={workoutStatus}
                isCameraActive={isCameraActive}
                isMuted={isMuted}
                onStartWorkout={handleStartWorkout}
                onPauseWorkout={handlePauseWorkout}
                onResumeWorkout={handleResumeWorkout}
                onEndWorkout={handleEndWorkout}
                onReset={handleReset}
                onToggleMute={toggleMute}
                layout="vertical"
              />

              <ExerciseSelector
                selected={exercise}
                onSelect={handleExerciseChange}
                layout="sidebar"
                compact
              />

              <button
                type="button"
                onClick={stopCamera}
                className="btn-icon pointer-events-auto self-end"
                title="Stop camera"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 sm:left-auto sm:right-4 sm:top-24 sm:translate-x-0 sm:translate-y-0">
          <ErrorState
            title={error.title}
            message={error.message}
            hint={error.hint}
            actionLabel="Try again"
            onAction={() => {
              setError(null);
              void startCamera();
            }}
          />
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 w-full text-center text-xs text-slate-500 hover:text-slate-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {summary && (
        <SessionSummary
          summary={summary}
          onClose={() => setSummary(null)}
          onNewWorkout={handleNewWorkout}
          onTrySuggestion={handleTrySuggestion}
          isAuthenticated={isAuthenticated}
          onLoginClick={onLoginClick}
          onSaveWorkout={handleSaveWorkout}
          saving={savingWorkout}
          saveSuccess={saveSuccess}
          saveError={saveError}
        />
      )}
    </div>
  );
}
