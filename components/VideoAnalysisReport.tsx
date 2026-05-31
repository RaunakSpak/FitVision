"use client";

import { formatDuration } from "@/lib/poseUtils";
import { gradeColor } from "@/lib/scoringUtils";
import type { VideoAnalysisReport } from "@/types/fitness";

interface VideoAnalysisReportViewProps {
  report: VideoAnalysisReport;
  isAuthenticated: boolean;
  saving?: boolean;
  saveSuccess?: boolean;
  saveError?: string | null;
  onSave?: () => Promise<void>;
  onLoginClick?: () => void;
  onNewAnalysis: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoAnalysisReportView({
  report,
  isAuthenticated,
  saving = false,
  saveSuccess = false,
  saveError = null,
  onSave,
  onLoginClick,
  onNewAnalysis,
}: VideoAnalysisReportViewProps) {
  const isPlank = report.exercise === "plank";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card border border-white/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neon-purple">
              Video Analysis Report
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {report.exerciseIcon} {report.exerciseLabel}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {report.framesWithPose} of {report.framesAnalyzed} frames analyzed
            </p>
          </div>
          <div
            className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/5 ${gradeColor(report.grade)}`}
          >
            <span className="text-3xl font-black">{report.grade}</span>
            <span className="text-[9px] uppercase tracking-wider opacity-70">Grade</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Form Score" value={`${report.formScore}/100`} accent="text-neon-green" />
          <Stat label="Duration" value={formatDuration(report.durationSeconds)} />
          {!isPlank ? (
            <>
              <Stat label="Total Reps" value={report.totalReps} accent="text-neon-cyan" />
              <Stat label="Good / Bad" value={`${report.goodReps} / ${report.badReps}`} />
            </>
          ) : (
            <Stat
              label="Best Hold"
              value={formatDuration(Math.floor(report.bestPlankHold))}
              accent="text-neon-cyan"
            />
          )}
        </div>
      </div>

      {report.mlAssistSummary?.used && (
        <div className="rounded-xl border border-neon-purple/25 bg-neon-purple/10 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-neon-purple">
            Experimental ML Assist Applied
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Confidence {Math.round(report.mlAssistSummary.avgConfidence * 100)}% ·{" "}
            {report.mlAssistSummary.adjustedFrames} frames nudged
          </p>
        </div>
      )}

      {report.topMistakes.length > 0 && (
        <section className="glass-card border border-white/10 p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Top Mistakes
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.topMistakes.map((m) => (
              <span
                key={m.id}
                className="rounded-lg border border-neon-pink/25 bg-neon-pink/10 px-3 py-1.5 text-xs text-neon-pink"
              >
                {m.label} ×{m.count}
              </span>
            ))}
          </div>
        </section>
      )}

      {report.mistakeFrequency.length > 0 && (
        <section className="glass-card border border-white/10 p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Mistake Frequency
          </h3>
          <div className="space-y-2">
            {report.mistakeFrequency.map((m) => {
              const max = report.mistakeFrequency[0]?.count ?? 1;
              const pct = Math.round((m.count / max) * 100);
              return (
                <div key={m.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-300">{m.label}</span>
                    <span className="tabular-nums text-slate-500">{m.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-neon-pink/80 to-neon-purple/80"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(report.bestFrame || report.worstFrame) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {report.bestFrame && (
            <FrameCard
              title="Best Form Frame"
              snapshot={report.bestFrame}
              accent="border-neon-green/30"
            />
          )}
          {report.worstFrame && (
            <FrameCard
              title="Needs Improvement"
              snapshot={report.worstFrame}
              accent="border-neon-pink/30"
            />
          )}
        </section>
      )}

      {report.timeline.length > 0 && (
        <section className="glass-card border border-white/10 p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Feedback Timeline
          </h3>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {report.timeline.map((entry, i) => (
              <li
                key={`${entry.timeSeconds}-${i}`}
                className="flex gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
              >
                <span className="shrink-0 text-[10px] font-mono tabular-nums text-neon-cyan">
                  {formatTime(entry.timeSeconds)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">{entry.feedback}</p>
                  <p className="text-[10px] text-slate-500">
                    Score {entry.formScore}
                    {!entry.isGoodForm && " · form issue"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {isAuthenticated && onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || saveSuccess}
            className="btn-primary flex-1 py-3 disabled:opacity-60"
          >
            {saving ? "Saving…" : saveSuccess ? "✓ Saved to History" : "Save Report"}
          </button>
        )}
        {!isAuthenticated && onLoginClick && (
          <button
            type="button"
            onClick={onLoginClick}
            className="flex-1 rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 py-3 text-sm font-semibold text-neon-cyan"
          >
            Sign in to save report
          </button>
        )}
        <button type="button" onClick={onNewAnalysis} className="btn-secondary flex-1 py-3">
          Analyze Another Video
        </button>
      </div>
      {saveError && (
        <p className="text-center text-sm text-neon-pink">{saveError}</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function FrameCard({
  title,
  snapshot,
  accent,
}: {
  title: string;
  snapshot: { timeSeconds: number; formScore: number; imageDataUrl: string };
  accent: string;
}) {
  return (
    <div className={`glass-card overflow-hidden border ${accent}`}>
      <div className="border-b border-white/10 px-4 py-2">
        <p className="text-xs font-semibold text-white">{title}</p>
        <p className="text-[10px] text-slate-400">
          {formatTime(snapshot.timeSeconds)} · Score {snapshot.formScore}
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={snapshot.imageDataUrl}
        alt={title}
        className="aspect-video w-full object-cover"
      />
    </div>
  );
}
