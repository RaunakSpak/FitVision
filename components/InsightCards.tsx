import type { InsightItem } from "@/lib/api";

interface InsightCardsProps {
  insights: InsightItem[];
}

const toneStyles: Record<string, string> = {
  positive: "border-neon-green/30 bg-neon-green/10 text-neon-green",
  warning: "border-neon-pink/30 bg-neon-pink/10 text-neon-pink",
  neutral: "border-neon-cyan/20 bg-neon-cyan/5 text-slate-200",
};

const toneIcons: Record<string, string> = {
  positive: "✦",
  warning: "⚠",
  neutral: "◈",
};

export default function InsightCards({ insights }: InsightCardsProps) {
  if (insights.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
        AI Insights
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight, i) => {
          const tone = insight.tone in toneStyles ? insight.tone : "neutral";
          return (
            <div
              key={`${insight.type}-${i}`}
              className={`rounded-xl border px-4 py-3 ${toneStyles[tone]}`}
            >
              <span className="mr-2 opacity-70">{toneIcons[tone] ?? "◈"}</span>
              <span className="text-sm leading-relaxed">{insight.message}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
