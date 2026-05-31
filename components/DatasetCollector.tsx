"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { getExerciseDef } from "@/lib/exerciseRegistry";
import {
  downloadTextFile,
  exportDatasetCSV,
  exportDatasetJSON,
  extractPoseFeatures,
  featuresToRecord,
} from "@/lib/ml/featureExtractor";
import { extractPoseLandmarks } from "@/lib/poseUtils";
import type {
  AnalyzableExerciseType,
  DatasetSample,
  FormLabel,
  MLMistakeType,
  PoseLandmarks,
} from "@/types/fitness";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

const EXERCISES: AnalyzableExerciseType[] = [
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

const MISTAKE_OPTIONS: { value: MLMistakeType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "hips_too_low", label: "Hips too low" },
  { value: "hips_too_high", label: "Hips too high" },
  { value: "not_deep_enough", label: "Not deep enough" },
  { value: "elbow_unstable", label: "Elbow unstable" },
  { value: "torso_lean", label: "Torso lean" },
  { value: "incomplete_rep", label: "Incomplete rep" },
  { value: "body_not_straight", label: "Body not straight" },
];

interface DatasetCollectorProps {
  open: boolean;
  onClose: () => void;
  /** Optional live landmarks from active trainer camera */
  liveLandmarks?: PoseLandmarks | null;
  liveExercise?: AnalyzableExerciseType;
}

export default function DatasetCollector({
  open,
  onClose,
  liveLandmarks = null,
  liveExercise,
}: DatasetCollectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [exercise, setExercise] = useState<AnalyzableExerciseType>("squat");
  const [formLabel, setFormLabel] = useState<FormLabel>("good_form");
  const [mistakeType, setMistakeType] = useState<MLMistakeType>("none");
  const [samples, setSamples] = useState<DatasetSample[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [poseOk, setPoseOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setPoseOk(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    if (liveLandmarks) {
      setPoseOk(true);
    }
  }, [open, liveLandmarks, stopCamera]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      setCameraOn(true);

      const loop = () => {
        const video = videoRef.current;
        const lm = landmarkerRef.current;
        if (video && lm && video.readyState >= 2) {
          const results = lm.detectForVideo(video, performance.now());
          setPoseOk(!!results.landmarks?.length);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setError("Camera access failed");
    }
  };

  const captureSample = () => {
    let landmarks = liveLandmarks;
    const ex = liveExercise ?? exercise;

    if (!landmarks && cameraOn && videoRef.current && landmarkerRef.current) {
      const results = landmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now()
      );
      if (results.landmarks?.[0]) {
        landmarks = extractPoseLandmarks(results.landmarks[0]);
      }
    }

    if (!landmarks) {
      setError("No pose detected — step into frame");
      return;
    }

    const features = extractPoseFeatures(landmarks, ex);
    const sample: DatasetSample = {
      id: `${Date.now()}-${samples.length}`,
      exercise: ex,
      formLabel,
      mistakeType: formLabel === "good_form" ? "none" : mistakeType,
      features: features.values,
      featureNames: [...features.names],
      timestamp: Date.now(),
    };

    setSamples((prev) => [...prev, sample]);
    setLastCapture(`${ex} · ${formLabel} · ${sample.mistakeType}`);
    setError(null);
  };

  const exportJson = () => {
    const rows = samples.map((s) =>
      featuresToRecord(
        {
          values: s.features,
          names: s.featureNames,
          exercise: s.exercise,
          timestamp: s.timestamp,
        },
        s.formLabel,
        s.mistakeType
      )
    );
    downloadTextFile(
      exportDatasetJSON(rows),
      `fitvision-dataset-${Date.now()}.json`,
      "application/json"
    );
  };

  const exportCsv = () => {
    const rows = samples.map((s) =>
      featuresToRecord(
        {
          values: s.features,
          names: s.featureNames,
          exercise: s.exercise,
          timestamp: s.timestamp,
        },
        s.formLabel,
        s.mistakeType
      )
    );
    downloadTextFile(
      exportDatasetCSV(rows),
      `fitvision-dataset-${Date.now()}.csv`,
      "text/csv"
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-neon-purple/20 bg-black/95 shadow-neon">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="text-lg font-bold text-white">Dataset Collector</h2>
            <p className="text-xs text-slate-400">{samples.length} samples · in-memory only</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!liveLandmarks && !cameraOn && (
            <button type="button" onClick={startCamera} className="btn-primary w-full py-2 text-sm">
              Start Collector Camera
            </button>
          )}

          {!liveLandmarks && cameraOn && (
            <video
              ref={videoRef}
              className="aspect-video w-full rounded-xl border border-white/10 bg-black object-cover -scale-x-100"
              playsInline
              muted
            />
          )}

          {liveLandmarks && (
            <p className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-3 py-2 text-xs text-neon-green">
              Using live trainer camera feed
            </p>
          )}

          <div>
            <label className="mb-1 block text-[10px] uppercase text-slate-400">Exercise</label>
            <select
              value={liveExercise ?? exercise}
              onChange={(e) => setExercise(e.target.value as AnalyzableExerciseType)}
              disabled={!!liveExercise}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {EXERCISES.map((ex) => (
                <option key={ex} value={ex}>
                  {getExerciseDef(ex).label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {(["good_form", "bad_form"] as FormLabel[]).map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setFormLabel(label)}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold ${
                  formLabel === label
                    ? label === "good_form"
                      ? "bg-neon-green/20 text-neon-green"
                      : "bg-neon-pink/20 text-neon-pink"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                {label === "good_form" ? "Good Form" : "Bad Form"}
              </button>
            ))}
          </div>

          {formLabel === "bad_form" && (
            <div>
              <label className="mb-1 block text-[10px] uppercase text-slate-400">
                Mistake label
              </label>
              <select
                value={mistakeType}
                onChange={(e) => setMistakeType(e.target.value as MLMistakeType)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                {MISTAKE_OPTIONS.filter((m) => m.value !== "none").map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={captureSample}
            disabled={!poseOk && !liveLandmarks}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            Record Sample
          </button>

          {lastCapture && (
            <p className="text-center text-xs text-neon-cyan">Last: {lastCapture}</p>
          )}
          {error && (
            <p className="text-center text-xs text-neon-pink">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportJson}
              disabled={samples.length === 0}
              className="btn-secondary flex-1 text-xs disabled:opacity-50"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={samples.length === 0}
              className="btn-secondary flex-1 text-xs disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <p className="text-[9px] text-slate-500">
            Training-ready export for offline model training. No data is sent to a server.
          </p>
        </div>
      </div>
    </div>
  );
}
