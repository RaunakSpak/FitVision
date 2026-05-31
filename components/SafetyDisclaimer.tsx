interface SafetyDisclaimerProps {
  compact?: boolean;
  className?: string;
}

export const SAFETY_DISCLAIMER =
  "FitVision AI provides general fitness feedback and is not a medical or professional coaching substitute.";

export default function SafetyDisclaimer({
  compact = false,
  className = "",
}: SafetyDisclaimerProps) {
  if (compact) {
    return (
      <p className={`text-[10px] leading-relaxed text-slate-500 ${className}`}>
        {SAFETY_DISCLAIMER}
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
        Safety & disclaimer
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{SAFETY_DISCLAIMER}</p>
    </div>
  );
}
