"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import SafetyDisclaimer from "@/components/SafetyDisclaimer";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    setSuccessMessage(null);
    clearError();
  }, [open, clearError]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError("Email is required");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    if (mode === "login" && !password) {
      setLocalError("Password is required");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(trimmedEmail, password);
        setSuccessMessage("Signed in successfully");
      } else {
        await register(trimmedEmail, password, fullName.trim() || undefined);
        setSuccessMessage("Account created — you are signed in");
      }
      setEmail("");
      setPassword("");
      setFullName("");
      onSuccess?.();
      setTimeout(() => onClose(), 400);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-md border border-white/15 p-6 shadow-neon animate-slide-up">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black text-white">
            FitVision<span className="text-neon-cyan"> AI</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "login" ? "Sign in to save workouts" : "Create your account"}
          </p>
        </div>

        <div className="mb-4 flex rounded-xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setLocalError(null);
              setSuccessMessage(null);
              clearError();
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-neon-cyan/20 text-neon-cyan"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setLocalError(null);
              setSuccessMessage(null);
              clearError();
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === "register"
                ? "bg-neon-purple/20 text-neon-purple"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-neon-cyan/50"
                placeholder="Optional"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-neon-cyan/50"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              minLength={mode === "register" ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-neon-cyan/50"
              placeholder={mode === "register" ? "Min 8 characters" : "••••••••"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {displayError && (
            <p className="rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-sm text-neon-pink">
              {displayError}
            </p>
          )}

          {successMessage && (
            <p className="rounded-lg border border-neon-green/30 bg-neon-green/10 px-3 py-2 text-sm text-neon-green">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>

        <div className="mt-4 border-t border-white/5 pt-4">
          <SafetyDisclaimer compact />
        </div>
      </div>
    </div>
  );
}
