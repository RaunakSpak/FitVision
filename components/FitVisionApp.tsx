"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import AppNavigation, { type AppView } from "@/components/AppNavigation";
import LandingPage from "@/components/LandingPage";
import CameraTrainer from "@/components/CameraTrainer";
import Dashboard from "@/components/Dashboard";
import VideoUploadAnalyzer from "@/components/VideoUploadAnalyzer";
import MLLab from "@/components/MLLab";
import AuthModal from "@/components/AuthModal";
import BackendStatusBanner from "@/components/BackendStatusBanner";
import WorkoutHistory from "@/components/WorkoutHistory";

export default function FitVisionApp() {
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const {
    workouts,
    loading: historyLoading,
    saving,
    error: historyError,
    fetchWorkouts,
    saveWorkout,
    deleteWorkout,
    clearError,
  } = useWorkoutHistory();

  const [view, setView] = useState<AppView>("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [autoStartCamera, setAutoStartCamera] = useState(false);

  const navigate = (next: AppView) => {
    setView(next);
    if (next !== "home") setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    clearError();
    if (isAuthenticated) {
      await fetchWorkouts();
    }
  };

  const startLiveTrainer = () => {
    setAutoStartCamera(true);
    navigate("trainer");
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    setHistoryOpen(false);
    navigate("home");
  };

  if (view === "home") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <BackendStatusBanner />
        <div className="h-full overflow-y-auto">
        <LandingPage
          onStartTrainer={startLiveTrainer}
          onVideoAnalysis={() => navigate("video")}
          onDashboard={() => navigate("dashboard")}
          onMLLab={() => navigate("mllab")}
          onSignIn={() => setAuthOpen(true)}
        />
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <BackendStatusBanner />
      <AppNavigation
        currentView={view}
        onNavigate={navigate}
        onHistoryClick={openHistory}
        historyActive={historyOpen}
        user={user}
        isAuthenticated={isAuthenticated}
        authLoading={authLoading}
        onLoginClick={() => setAuthOpen(true)}
        onLogout={logout}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden pb-16 md:pb-0">
        {view === "trainer" && (
          <div className="absolute inset-0 bottom-16 md:bottom-0">
            <CameraTrainer
              isAuthenticated={isAuthenticated}
              savingWorkout={saving}
              autoStartCamera={autoStartCamera}
              onAutoStartHandled={() => setAutoStartCamera(false)}
              onLoginClick={() => setAuthOpen(true)}
              onSaveWorkout={saveWorkout}
            />
          </div>
        )}

        {view === "dashboard" && (
          <Dashboard
            user={user}
            isAuthenticated={isAuthenticated}
            authLoading={authLoading}
            onLoginClick={() => setAuthOpen(true)}
          />
        )}

        {view === "video" && (
          <VideoUploadAnalyzer
            user={user}
            isAuthenticated={isAuthenticated}
            onLoginClick={() => setAuthOpen(true)}
            onSaveReport={saveWorkout}
            saving={saving}
          />
        )}

        {view === "mllab" && <MLLab />}
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <WorkoutHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        workouts={workouts}
        loading={historyLoading}
        error={historyError}
        onDelete={deleteWorkout}
        onRefresh={fetchWorkouts}
        isAuthenticated={isAuthenticated}
        onLoginClick={() => {
          setHistoryOpen(false);
          setAuthOpen(true);
        }}
      />
    </div>
  );
}
