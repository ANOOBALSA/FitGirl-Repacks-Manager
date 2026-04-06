"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

interface InitializationContextType {
  registerTask: (id: string) => void;
  markTaskComplete: (id: string) => void;
  isInitialized: boolean;
  pendingTasks: string[];
}

const InitializationContext = createContext<InitializationContextType | undefined>(undefined);

export function InitializationProvider({ children }: { children: React.ReactNode }) {
  const [pendingTasks, setPendingTasks] = useState<string[]>([]);
  const [initStarted, setInitStarted] = useState(false);

  const registerTask = useCallback((id: string) => {
    setPendingTasks((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setInitStarted(true);
  }, []);

  const markTaskComplete = useCallback((id: string) => {
    setPendingTasks((prev) => prev.filter((t) => t !== id));
  }, []);

  const isInitialized = useMemo(() => {
    return initStarted && pendingTasks.length === 0;
  }, [initStarted, pendingTasks.length]);

  return (
    <InitializationContext.Provider value={{ registerTask, markTaskComplete, isInitialized, pendingTasks }}>
      {children}
    </InitializationContext.Provider>
  );
}

export const useInitialization = () => {
  const context = useContext(InitializationContext);
  if (context === undefined) {
    throw new Error("useInitialization must be used within an InitializationProvider");
  }
  return context;
};
