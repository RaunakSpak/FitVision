interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyState({
  icon = "📭",
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <div className="glass-card mx-auto max-w-md border border-white/10 p-8 text-center animate-fade-in">
      <p className="text-4xl">{icon}</p>
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {actionLabel && onAction && (
            <button type="button" onClick={onAction} className="btn-primary px-6 py-2.5">
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button type="button" onClick={onSecondary} className="btn-secondary px-6 py-2.5">
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
