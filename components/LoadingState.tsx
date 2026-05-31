interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

export default function LoadingState({
  message = "Loading…",
  fullScreen = false,
  size = "md",
}: LoadingStateProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`animate-spin rounded-full border-2 border-neon-cyan border-t-transparent ${sizeMap[size]}`}
      />
      {message && <p className="text-sm text-slate-400">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-[40vh] flex-1 items-center justify-center py-16">
        {spinner}
      </div>
    );
  }

  return <div className="flex justify-center py-12">{spinner}</div>;
}
