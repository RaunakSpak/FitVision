import { getExerciseDef } from "@/lib/exerciseRegistry";
import { scoreToGrade } from "@/lib/scoringUtils";
import type {
  AnalyzableExerciseType,
  ExerciseStats,
  SessionSummaryData,
  VideoAnalysisReport,
  VideoFrameSnapshot,
  VideoTimelineEntry,
} from "@/types/fitness";

export const VIDEO_ACCEPT =
  "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

export const VIDEO_SAMPLE_INTERVAL_SEC = 0.25;
export const VIDEO_MAX_SAMPLES = 240;

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm"];

export function isSupportedVideoFile(file: File): boolean {
  if (ALLOWED_VIDEO_TYPES.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function validateVideoFile(file: File): string | null {
  if (!isSupportedVideoFile(file)) {
    return "Unsupported format. Use MP4, MOV, or WebM.";
  }
  const maxMb = 100;
  if (file.size > maxMb * 1024 * 1024) {
    return `Video must be under ${maxMb}MB for browser analysis.`;
  }
  return null;
}

export function computeSampleTimes(
  durationSeconds: number,
  intervalSec = VIDEO_SAMPLE_INTERVAL_SEC,
  maxSamples = VIDEO_MAX_SAMPLES
): number[] {
  if (durationSeconds <= 0) return [0];

  const interval = Math.max(
    intervalSec,
    durationSeconds / maxSamples
  );
  const times: number[] = [];
  for (let t = 0; t <= durationSeconds; t += interval) {
    times.push(Math.min(t, durationSeconds));
  }
  if (times[times.length - 1] < durationSeconds) {
    times.push(durationSeconds);
  }
  return times;
}

export function waitForVideoSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Video seek timed out"));
    }, 8000);

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
    };

    video.addEventListener("seeked", onSeeked);
  });
}

export function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to load video"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
  });
}

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  timeSeconds: number
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      video.pause();
      video.currentTime = timeSeconds;
      await waitForVideoSeek(video);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not capture frame"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    } catch (err) {
      reject(err);
    }
  });
}

interface BuildReportInput {
  exercise: AnalyzableExerciseType;
  durationSeconds: number;
  stats: ExerciseStats;
  topMistakes: { id: string; label: string; count: number }[];
  timeline: VideoTimelineEntry[];
  bestFrame: VideoFrameSnapshot | null;
  worstFrame: VideoFrameSnapshot | null;
  framesAnalyzed: number;
  framesWithPose: number;
}

export function buildVideoAnalysisReport(
  input: BuildReportInput
): VideoAnalysisReport {
  const def = getExerciseDef(input.exercise);
  const formScore = Math.round(input.stats.formScore);
  const grade = scoreToGrade(formScore);

  const base = {
    exercise: input.exercise,
    exerciseLabel: def.label,
    exerciseIcon: def.icon,
    durationSeconds: Math.floor(input.durationSeconds),
    formScore,
    grade,
    topMistakes: input.topMistakes.slice(0, 5),
    mistakeFrequency: input.topMistakes,
    timeline: input.timeline,
    bestFrame: input.bestFrame,
    worstFrame: input.worstFrame,
    framesAnalyzed: input.framesAnalyzed,
    framesWithPose: input.framesWithPose,
  };

  if (input.stats.kind === "plank") {
    return {
      ...base,
      totalReps: 0,
      goodReps: 0,
      badReps: 0,
      bestPlankHold: input.stats.bestHoldTime,
    };
  }

  return {
    ...base,
    totalReps: input.stats.totalReps,
    goodReps: input.stats.goodReps,
    badReps: input.stats.badReps,
    bestPlankHold: 0,
  };
}

export function videoReportToSessionSummary(
  report: VideoAnalysisReport
): SessionSummaryData {
  return {
    exercise: report.exercise,
    exerciseLabel: `${report.exerciseLabel} (Video)`,
    exerciseIcon: report.exerciseIcon,
    durationSeconds: report.durationSeconds,
    formScore: report.formScore,
    grade: report.grade,
    totalReps: report.totalReps,
    goodReps: report.goodReps,
    badReps: report.badReps,
    bestPlankHold: report.bestPlankHold,
    topMistakes: report.topMistakes,
    gymLog: [],
    muscleGroupsTrained: [],
    suggestions: [],
    isGymMode: false,
  };
}
