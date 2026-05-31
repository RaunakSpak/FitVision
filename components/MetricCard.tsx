interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: "cyan" | "green" | "purple" | "pink";
  icon?: string;
}

const accentStyles = {
  cyan: "from-neon-cyan/20 to-transparent border-neon-cyan/25 text-neon-cyan",
  green: "from-neon-green/20 to-transparent border-neon-green/25 text-neon-green",
  purple: "from-neon-purple/20 to-transparent border-neon-purple/25 text-neon-purple",
  pink: "from-neon-pink/20 to-transparent border-neon-pink/25 text-neon-pink",
};

export default function MetricCard({
  label,
  value,
  subtext,
  accent = "cyan",
  icon,
}: MetricCardProps) {
  return (
    <div
      className={`glass-card relative overflow-hidden border bg-gradient-to-br p-4 ${accentStyles[accent]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-[11px] text-slate-400">{subtext}</p>
          )}
        </div>
        {icon && <span className="text-2xl opacity-80">{icon}</span>}
      </div>
    </div>
  );
}
