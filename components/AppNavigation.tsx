"use client";

import type { User } from "@/lib/api";

export type AppView = "home" | "trainer" | "video" | "dashboard" | "mllab";

interface AppNavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onHistoryClick: () => void;
  historyActive?: boolean;
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: { id: AppView | "history"; label: string; icon: string; mobileLabel?: string }[] = [
  { id: "home", label: "Home", icon: "⌂", mobileLabel: "Home" },
  { id: "trainer", label: "Live Trainer", icon: "📹", mobileLabel: "Live" },
  { id: "video", label: "Video Analysis", icon: "🎬", mobileLabel: "Video" },
  { id: "dashboard", label: "Dashboard", icon: "📊", mobileLabel: "Stats" },
  { id: "mllab", label: "ML Lab", icon: "🧠", mobileLabel: "ML" },
  { id: "history", label: "History", icon: "📋", mobileLabel: "History" },
];

export default function AppNavigation({
  currentView,
  onNavigate,
  onHistoryClick,
  historyActive = false,
  user,
  isAuthenticated,
  authLoading,
  onLoginClick,
  onLogout,
}: AppNavigationProps) {
  const handleNav = (id: AppView | "history") => {
    if (id === "history") {
      onHistoryClick();
      return;
    }
    onNavigate(id);
  };

  return (
    <>
      {/* Desktop / tablet top bar */}
      <header className="hidden shrink-0 border-b border-white/10 bg-black/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="text-lg font-black tracking-tight text-white transition hover:text-neon-cyan"
          >
            FitVision<span className="text-neon-cyan"> AI</span>
          </button>

          <nav className="flex flex-1 items-center justify-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.id === "history"
                  ? historyActive
                  : currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-neon-cyan/15 text-neon-cyan ring-1 ring-neon-cyan/25"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {authLoading ? (
              <span className="text-xs text-slate-500">…</span>
            ) : isAuthenticated && user ? (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 lg:flex">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 text-xs font-bold text-white">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </span>
                  <span
                    className="max-w-[120px] truncate text-xs font-medium text-slate-200"
                    title={user.email}
                  >
                    {user.full_name || user.email.split("@")[0]}
                  </span>
                </div>
                <button type="button" onClick={onLogout} className="btn-secondary px-3 py-1.5 text-xs">
                  Logout
                </button>
              </>
            ) : (
              <button type="button" onClick={onLoginClick} className="btn-primary px-4 py-1.5 text-xs">
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/85 px-4 py-2.5 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="text-base font-black text-white"
        >
          FitVision<span className="text-neon-cyan"> AI</span>
        </button>
        {authLoading ? null : isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 text-xs font-bold text-white">
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </span>
            <button type="button" onClick={onLogout} className="text-xs text-slate-400">
              Logout
            </button>
          </div>
        ) : (
          <button type="button" onClick={onLoginClick} className="text-xs font-semibold text-neon-cyan">
            Sign In
          </button>
        )}
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.id === "history" ? historyActive : currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px] font-semibold transition ${
                  active ? "text-neon-cyan" : "text-slate-500"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.mobileLabel ?? item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
