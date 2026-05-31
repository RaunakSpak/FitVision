"use client";

import { EXERCISE_DEFINITIONS } from "@/lib/exerciseRegistry";
import SafetyDisclaimer from "@/components/SafetyDisclaimer";

interface LandingPageProps {
  onStartTrainer: () => void;
  onVideoAnalysis: () => void;
  onDashboard: () => void;
  onMLLab: () => void;
  onSignIn: () => void;
}

const FEATURES = [
  {
    icon: "📹",
    title: "Live AI Trainer",
    desc: "Real-time pose detection, rep counting, and form feedback through your webcam.",
  },
  {
    icon: "🎬",
    title: "Video Analysis",
    desc: "Upload workout clips and get a full form report — analyzed locally in your browser.",
  },
  {
    icon: "📊",
    title: "Progress Dashboard",
    desc: "Track streaks, scores, mistakes, and trends with interactive charts.",
  },
  {
    icon: "🧠",
    title: "ML Lab",
    desc: "Experimental ML assist and dataset tools for training-ready feature export.",
  },
  {
    icon: "🔊",
    title: "Voice Coach",
    desc: "Hands-free audio cues with smart cooldown so coaching stays helpful, not noisy.",
  },
  {
    icon: "☁️",
    title: "Cloud History",
    desc: "Save sessions securely with JWT auth — your workouts sync when you sign in.",
  },
];

const STEPS = [
  { step: "01", title: "Choose your mode", desc: "Live camera, video upload, or Gym AI auto-detect." },
  { step: "02", title: "Train with feedback", desc: "Get reps, grades, and real-time form corrections." },
  { step: "03", title: "Review & improve", desc: "Save sessions, explore analytics, and track progress." },
];

const INSIGHTS = [
  "Form score trends over time",
  "Most common mistake detection",
  "Weekly volume and consistency streaks",
  "Exercise distribution breakdown",
  "Rule-based + experimental ML hints",
];

export default function LandingPage({
  onStartTrainer,
  onVideoAnalysis,
  onDashboard,
  onMLLab,
  onSignIn,
}: LandingPageProps) {
  return (
    <div className="min-h-full bg-black text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-neon-cyan/10 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-neon-purple/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-neon-cyan/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/10 px-4 py-1.5 text-xs font-semibold text-neon-cyan">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-neon-cyan" />
            </span>
            AI-powered fitness platform
          </div>

          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Train smarter with{" "}
            <span className="bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
              real-time AI form correction.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            FitVision AI combines browser pose detection, voice coaching, progress analytics,
            and optional ML assist — no expensive hardware required.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Live trainer and video analysis work without signing in. Sign in only to save workouts and view your history.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={onStartTrainer} className="btn-primary px-8 py-3.5 text-base">
              Start Live Trainer
            </button>
            <button type="button" onClick={onVideoAnalysis} className="btn-secondary px-8 py-3.5 text-base">
              Analyze a Video
            </button>
            <button type="button" onClick={onSignIn} className="text-sm font-semibold text-neon-cyan hover:underline">
              Sign in to save workouts →
            </button>
          </div>

          {/* Demo preview */}
          <div className="glass-card mt-14 overflow-hidden border border-white/10 shadow-neon animate-slide-up">
            <div className="border-b border-white/10 bg-white/5 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-neon-pink/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-neon-green/80" />
                <span className="ml-2 text-[10px] text-slate-500">Live trainer preview</span>
              </div>
            </div>
            <div className="relative aspect-video bg-gradient-to-br from-slate-900 via-black to-slate-900 p-4 sm:p-8">
              <div className="absolute inset-0 opacity-30">
                <svg className="h-full w-full" viewBox="0 0 400 200">
                  <line x1="200" y1="40" x2="160" y2="90" stroke="#00f5ff" strokeWidth="2" />
                  <line x1="200" y1="40" x2="240" y2="90" stroke="#00f5ff" strokeWidth="2" />
                  <line x1="160" y1="90" x2="140" y2="130" stroke="#8338ec" strokeWidth="2" />
                  <line x1="240" y1="90" x2="260" y2="130" stroke="#8338ec" strokeWidth="2" />
                  <line x1="200" y1="40" x2="200" y2="110" stroke="#39ff14" strokeWidth="2" />
                  <line x1="200" y1="110" x2="170" y2="170" stroke="#39ff14" strokeWidth="2" />
                  <line x1="200" y1="110" x2="230" y2="170" stroke="#39ff14" strokeWidth="2" />
                </svg>
              </div>
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex flex-wrap gap-2">
                  <span className="score-badge score-badge-green">Form 92</span>
                  <span className="exercise-badge">Squat</span>
                  <span className="rounded-full bg-neon-green/15 px-2 py-0.5 text-[10px] font-bold text-neon-green">
                    LIVE
                  </span>
                </div>
                <div className="overlay-panel max-w-xs px-3 py-2 text-sm text-white">
                  Go deeper — keep chest up
                </div>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>Reps <strong className="text-neon-cyan">12</strong></span>
                  <span>Grade <strong className="text-neon-green">A</strong></span>
                  <span>Score <strong className="text-white">92</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="section-title">Everything you need to train smarter</h2>
          <p className="section-subtitle">Built for home workouts, gym sessions, and progress tracking.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass-card group border border-white/10 p-5 transition hover:border-neon-cyan/25 hover:shadow-neon"
              >
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 bg-white/[0.02] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="section-title">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="relative pl-4">
                <span className="text-3xl font-black text-neon-cyan/30">{s.step}</span>
                <h3 className="mt-2 font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Exercises */}
      <section className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="section-title">Supported exercises</h2>
          <p className="section-subtitle">Plus Gym AI auto-detect for mixed sessions.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {EXERCISE_DEFINITIONS.map((ex) => (
              <span key={ex.id} className="exercise-badge">
                {ex.icon} {ex.label}
              </span>
            ))}
            <span className="exercise-badge border-neon-purple/30 bg-neon-purple/10 text-neon-purple">
              🤖 Gym AI
            </span>
          </div>
        </div>
      </section>

      {/* AI Insights */}
      <section className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="section-title">AI insights that compound</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {INSIGHTS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"
              >
                <span className="text-neon-cyan">✦</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="glass-card mx-auto max-w-3xl border border-neon-cyan/20 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Ready to train?</h2>
          <p className="mt-3 text-slate-400">Jump into the live trainer or explore your progress dashboard.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={onStartTrainer} className="btn-primary px-8 py-3">
              Open Live Trainer
            </button>
            <button type="button" onClick={onDashboard} className="btn-secondary px-8 py-3">
              View Dashboard
            </button>
            <button type="button" onClick={onMLLab} className="btn-secondary px-8 py-3">
              ML Lab
            </button>
          </div>
        </div>
      </section>

      {/* Disclaimer + footer */}
      <section className="border-t border-white/5 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <SafetyDisclaimer />
          <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-slate-500 sm:flex-row">
            <span>© {new Date().getFullYear()} FitVision AI</span>
            <span>Built with MediaPipe · Next.js · FastAPI</span>
          </footer>
        </div>
      </section>
    </div>
  );
}
