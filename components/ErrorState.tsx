interface ErrorStateProps {
  title?: string;
  message: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "error" | "warning" | "offline";
}

const variantStyles = {
  error: "border-neon-pink/30 bg-neon-pink/10 text-neon-pink",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  offline: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

export default function ErrorState({
  title = "Something went wrong",
  message,
  hint,
  actionLabel,
  onAction,
  variant = "error",
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 animate-fade-in ${variantStyles[variant]}`}
      role="alert"
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-90">{message}</p>
      {hint && <p className="mt-2 text-xs opacity-70">{hint}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-lg border border-white/20 bg-black/30 px-4 py-1.5 text-xs font-semibold text-white hover:bg-black/50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
