"use client";

import { useEffect, useRef } from "react";
import { useInitialization } from "./InitializationProvider";

export function AppInitializer() {
  const { isInitialized, pendingTasks } = useInitialization();
  const signaledRef = useRef(false);

  useEffect(() => {
    if (isInitialized && !signaledRef.current) {
      console.log(
        "[AppInitializer] All systems ready (Auth, Sync, IGDB). Signaling main process...",
      );
      if (typeof window !== "undefined" && (window as any).electron) {
        (window as any).electron.showMainWindow();
        signaledRef.current = true;
      }
    }
  }, [isInitialized]);

  useEffect(() => {
    if (pendingTasks.length > 0) {
      console.log("[AppInitializer] Waiting for tasks:", pendingTasks);
    }
  }, [pendingTasks]);

  return null;
}
