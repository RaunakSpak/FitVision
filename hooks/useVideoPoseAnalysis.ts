"use client";

import { useCallback, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { createExerciseAnalyzer } from "@/lib/exerciseAnalyzer";
import { extractPoseLandmarks } from "@/lib/poseUtils";
import {
  buildVideoAnalysisReport,
  captureVideoFrame,
  computeSampleTimes,
  waitForVideoMetadata,
  waitForVideoSeek,
  yieldToMain,
} from "@/lib/videoAnalysisUtils";
import { summarizeMLSession } from "@/lib/ml/hybridAnalyzer";
import type {
  AnalyzableExerciseType,
  MLAssistMeta,
  VideoAnalysisReport,
  VideoAnalysisStatus,
  VideoTimelineEntry,
} from "@/types/fitness";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

export function useVideoPoseAnalysis() {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const abortRef = useRef(false);

  const [status, setStatus] = useState<VideoAnalysisStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<VideoAnalysisReport | null>(null);

  const initLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    setStatus("loading_model");
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return landmarkerRef.current;
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus("idle");
    setProgress(0);
    setError(null);
    setReport(null);
  }, []);

  const analyzeVideo = useCallback(
    async (video: HTMLVideoElement, exercise: AnalyzableExerciseType, mlEnabled = false) => {
      abortRef.current = false;
      setError(null);
      setReport(null);
      setProgress(0);

      try {
        await waitForVideoMetadata(video);
        const landmarker = await initLandmarker();
        if (!landmarker) throw new Error("Pose model failed to load");

        setStatus("analyzing");

        const analyzer = createExerciseAnalyzer();
        analyzer.setExercise(exercise);
        analyzer.setMLEnabled(mlEnabled);
        analyzer.resetAll();

        const duration = video.duration;
        const sampleTimes = computeSampleTimes(duration);
        const timeline: VideoTimelineEntry[] = [];
        let lastFeedback = "";
        let bestScore = -1;
        let worstScore = 101;
        let bestTime = 0;
        let worstTime = 0;
        let framesWithPose = 0;
        let lastTimestampMs = -1;
        const mlLog: MLAssistMeta[] = [];
        let lastMlMeta: MLAssistMeta | null = null;

        video.pause();

        for (let i = 0; i < sampleTimes.length; i++) {
          if (abortRef.current) {
            setStatus("idle");
            return null;
          }

          const timeSec = sampleTimes[i];
          video.currentTime = timeSec;
          await waitForVideoSeek(video);
          await yieldToMain();

          if (video.videoWidth === 0 || video.readyState < 2) {
            setProgress(Math.round(((i + 1) / sampleTimes.length) * 100));
            continue;
          }

          const timestampMs = Math.max(
            Math.round(timeSec * 1000),
            lastTimestampMs + 1
          );
          lastTimestampMs = timestampMs;

          const results = landmarker.detectForVideo(video, timestampMs);

          if (!results.landmarks?.length) {
            setProgress(Math.round(((i + 1) / sampleTimes.length) * 100));
            continue;
          }

          const poseLandmarks = extractPoseLandmarks(results.landmarks[0]);
          if (!poseLandmarks) {
            setProgress(Math.round(((i + 1) / sampleTimes.length) * 100));
            continue;
          }

          const result = analyzer.analyzeOfflineFrame(poseLandmarks, timestampMs);
          if (!result) {
            setProgress(Math.round(((i + 1) / sampleTimes.length) * 100));
            continue;
          }

          if (result.mlAssist) {
            mlLog.push(result.mlAssist);
            lastMlMeta = result.mlAssist;
          }

          framesWithPose += 1;

          if (result.formScore > bestScore) {
            bestScore = result.formScore;
            bestTime = timeSec;
          }
          if (result.formScore < worstScore) {
            worstScore = result.formScore;
            worstTime = timeSec;
          }

          if (
            result.feedback !== lastFeedback &&
            !result.feedback.includes("Move into frame")
          ) {
            timeline.push({
              timeSeconds: timeSec,
              feedback: result.feedback,
              formScore: Math.round(result.formScore),
              isGoodForm: result.isGoodForm,
            });
            lastFeedback = result.feedback;
          }

          setProgress(Math.round(((i + 1) / sampleTimes.length) * 100));
        }

        if (framesWithPose === 0) {
          throw new Error(
            "No pose detected in video. Ensure your full body is visible and well lit."
          );
        }

        let bestFrame = null;
        let worstFrame = null;

        if (bestScore >= 0 && bestTime !== worstTime) {
          try {
            const bestUrl = await captureVideoFrame(video, bestTime);
            bestFrame = {
              timeSeconds: bestTime,
              formScore: Math.round(bestScore),
              imageDataUrl: bestUrl,
            };
          } catch {
            /* optional snapshot */
          }
        }

        if (worstScore <= 100) {
          try {
            const worstUrl = await captureVideoFrame(video, worstTime);
            worstFrame = {
              timeSeconds: worstTime,
              formScore: Math.round(worstScore),
              imageDataUrl: worstUrl,
            };
          } catch {
            /* optional snapshot */
          }
        }

        const built = buildVideoAnalysisReport({
          exercise,
          durationSeconds: duration,
          stats: analyzer.getStats(),
          topMistakes: analyzer.getMistakes().getTop(10),
          timeline: timeline.slice(-40),
          bestFrame,
          worstFrame,
          framesAnalyzed: sampleTimes.length,
          framesWithPose,
        });

        if (mlEnabled && mlLog.length > 0) {
          const mlSummary = summarizeMLSession(mlLog);
          built.mlAssistSummary = {
            used: true,
            avgConfidence: mlSummary.avgConfidence,
            adjustedFrames: mlSummary.adjustedFrames,
            topMlMistake: mlSummary.topMlMistake,
          };
        }

        setReport(built);
        setStatus("complete");
        return { report: built, lastMlMeta };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Video analysis failed";
        setError(message);
        setStatus("error");
        return null;
      }
    },
    [initLandmarker]
  );

  return {
    status,
    progress,
    error,
    report,
    analyzeVideo,
    reset,
    abort: () => {
      abortRef.current = true;
    },
  };
}
