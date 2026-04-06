import { useState, useEffect, useCallback } from "react";
import { Game } from "./igdb";

export interface UserData {
  userGames: Record<number, string[]>;
  statusTimestamps: Record<string, number>;
  readRepacks: string[];
  repackIgdbMapping: Record<string, number>;
  virtualGames: Record<number, Game>;
  gamePaths: Record<number, string>;
  gameDs4Settings: Record<number, boolean>;
  playTime: Record<number, number>;
  lastPlayedTimestamps: Record<number, number>;
  downloadedGames?: Record<number, string>;
  settings: UserSettings;
  migrationVersion: number;
}

export interface UserSettings {
  downloadDirectory: string;
  defaultInstallDirectory: string;
  unpackAfterDownload: boolean;
  closeToTray: boolean;
  runOnStartup: boolean;
  startMinimized: boolean;
  ds4WindowsPath: string;
}

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await window.electron.allUserData();
      setUserData(data);
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();

    const electron = (window as any).electron;
    if (electron?.onUserDataUpdated) {
      const unsubscribe = electron.onUserDataUpdated(() => {
        loadAll(true);
      });
      return unsubscribe;
    }
  }, [loadAll]);

  const updateKey = async <K extends keyof UserData>(
    key: K,
    value: UserData[K],
  ) => {
    setUserData((prev) => (prev ? { ...prev, [key]: value } : null));
    try {
      await window.electron.setUserData(key, value);
    } catch (error) {
      console.error(`Failed to update user data key ${key}:`, error);
      loadAll(true);
    }
  };

  const updateGameStatus = async (
    gameId: number,
    status: string,
    gameMetadata?: Game,
  ) => {
    if (!userData) return;

    const userGames = { ...userData.userGames };
    let currentStatuses = userGames[gameId] || [];
    const isAdding = !currentStatuses.includes(status);
    const ts = { ...userData.statusTimestamps };

    if (!isAdding) {
      currentStatuses = currentStatuses.filter((s) => s !== status);
      delete (ts as any)[`${gameId}:${status}`];
    } else {
      const exclusiveGroup = ["playing", "wishlist", "completed"];

      if (exclusiveGroup.includes(status)) {
        exclusiveGroup.forEach((s) => {
          if (s !== status) {
            currentStatuses = currentStatuses.filter((c) => c !== s);
            delete (ts as any)[`${gameId}:${s}`];
          }
        });
      }

      if (!currentStatuses.includes(status)) {
        currentStatuses.push(status);
        (ts as any)[`${gameId}:${status}`] = Date.now();
      }
    }

    if (currentStatuses.length === 0) {
      delete userGames[gameId];
    } else {
      userGames[gameId] = currentStatuses;
    }

    const updates: Partial<UserData> = {
      userGames,
      statusTimestamps: ts,
    };

    if (gameId <= 0 && gameMetadata) {
      const vGames = { ...userData.virtualGames };
      (vGames as any)[gameId] = gameMetadata;
      updates.virtualGames = vGames;
    }

    setUserData((prev) => (prev ? { ...prev, ...updates } : null));

    try {
      if (updates.userGames)
        await window.electron.setUserData("userGames", updates.userGames);
      if (updates.statusTimestamps)
        await window.electron.setUserData(
          "statusTimestamps",
          updates.statusTimestamps,
        );
      if (updates.virtualGames)
        await window.electron.setUserData("virtualGames", updates.virtualGames);
    } catch (error) {
      console.error("Failed to update game status:", error);
      loadAll(true);
    }
  };

  return {
    userData,
    loading,
    updateKey,
    updateGameStatus,
    reload: loadAll,
  };
}
