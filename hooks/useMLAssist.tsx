"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { MLAssistMeta } from "@/types/fitness";

interface MLAssistContextValue {
  mlAssistEnabled: boolean;
  setMlAssistEnabled: (enabled: boolean) => void;
  datasetCollectorOpen: boolean;
  setDatasetCollectorOpen: (open: boolean) => void;
  lastMLMeta: MLAssistMeta | null;
  setLastMLMeta: (meta: MLAssistMeta | null) => void;
}

const MLAssistContext = createContext<MLAssistContextValue | null>(null);

export function MLAssistProvider({ children }: { children: React.ReactNode }) {
  const [mlAssistEnabled, setMlAssistEnabled] = useState(false);
  const [datasetCollectorOpen, setDatasetCollectorOpen] = useState(false);
  const [lastMLMeta, setLastMLMeta] = useState<MLAssistMeta | null>(null);

  const value = useMemo(
    () => ({
      mlAssistEnabled,
      setMlAssistEnabled,
      datasetCollectorOpen,
      setDatasetCollectorOpen,
      lastMLMeta,
      setLastMLMeta,
    }),
    [mlAssistEnabled, datasetCollectorOpen, lastMLMeta]
  );

  return (
    <MLAssistContext.Provider value={value}>{children}</MLAssistContext.Provider>
  );
}

export function useMLAssist() {
  const ctx = useContext(MLAssistContext);
  if (!ctx) {
    throw new Error("useMLAssist must be used within MLAssistProvider");
  }
  return ctx;
}

export function useMLAssistOptional() {
  return useContext(MLAssistContext);
}
