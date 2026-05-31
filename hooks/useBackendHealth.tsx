"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { healthApi } from "@/lib/api";

interface BackendHealthContextValue {
  isOnline: boolean;
  checking: boolean;
  lastChecked: Date | null;
  recheck: () => Promise<void>;
}

const BackendHealthContext = createContext<BackendHealthContextValue | null>(
  null
);

const POLL_MS = 30_000;

export function BackendHealthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await healthApi.check();
      setIsOnline(res.status === "ok");
    } catch {
      setIsOnline(false);
    } finally {
      setLastChecked(new Date());
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void recheck();
    const interval = setInterval(() => {
      void recheck();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [recheck]);

  const value = useMemo(
    () => ({ isOnline, checking, lastChecked, recheck }),
    [isOnline, checking, lastChecked, recheck]
  );

  return (
    <BackendHealthContext.Provider value={value}>
      {children}
    </BackendHealthContext.Provider>
  );
}

export function useBackendHealth() {
  const ctx = useContext(BackendHealthContext);
  if (!ctx) {
    throw new Error("useBackendHealth must be used within BackendHealthProvider");
  }
  return ctx;
}
