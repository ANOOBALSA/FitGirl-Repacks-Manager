"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthProvider";
import { notifications } from "@mantine/notifications";

interface SyncContextType {
  syncing: boolean;
  lastSynced: Date | null;
  initialSyncDone: boolean;
  sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const USER_DATA_TABLE = "user_data";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const isSyncingRef = useRef(false);

  const sync = async (pushOnly = false) => {
    if (!user || isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      setSyncing(true);

      if (!pushOnly) {
        let remoteData: any = null;
        try {
          const { data, error } = await supabase
            .from(USER_DATA_TABLE)
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            remoteData = {
              userGames: data.userGames ? JSON.parse(data.userGames) : {},
              statusTimestamps: data.statusTimestamps
                ? JSON.parse(data.statusTimestamps)
                : {},
              readRepacks: data.readRepacks ? JSON.parse(data.readRepacks) : [],
              repackIgdbMapping: data.repackIgdbMapping
                ? JSON.parse(data.repackIgdbMapping)
                : {},
              virtualGames: data.virtualGames
                ? JSON.parse(data.virtualGames)
                : {},
              gamePaths: data.gamePaths ? JSON.parse(data.gamePaths) : {},
              ds4Path: data.ds4Path || "",
              gameDs4Settings: data.gameDs4Settings
                ? JSON.parse(data.gameDs4Settings)
                : {},
              playTime: data.playTime ? JSON.parse(data.playTime) : {},
              lastPlayedTimestamps: data.lastPlayedTimestamps
                ? JSON.parse(data.lastPlayedTimestamps)
                : {},
              activeDownloads: data.activeDownloads
                ? JSON.parse(data.activeDownloads)
                : {},
              downloadedGames: data.downloadedGames
                ? JSON.parse(data.downloadedGames)
                : {},
              settings: data.settings ? JSON.parse(data.settings) : {},
              migrationVersion: data.migrationVersion || 1,
            };
          }
        } catch (e: any) {
          console.log("[Sync] Error fetching remote document:", e.message);
        }

        if (remoteData) {
          console.log("[Sync] Merging remote data before push...");
          await (window as any).electron.syncUserDataDown(remoteData);
        }
      }

      const localData = (await (window as any).electron.allUserData()) || {};

      const payload = {
        user_id: user.id,
        userGames: JSON.stringify(localData.userGames || {}),
        statusTimestamps: JSON.stringify(localData.statusTimestamps || {}),
        readRepacks: JSON.stringify(localData.readRepacks || []),
        repackIgdbMapping: JSON.stringify(localData.repackIgdbMapping || {}),
        virtualGames: JSON.stringify(localData.virtualGames || {}),
        gamePaths: JSON.stringify(localData.gamePaths || {}),
        ds4Path: localData.ds4Path || "",
        gameDs4Settings: JSON.stringify(localData.gameDs4Settings || {}),
        playTime: JSON.stringify(localData.playTime || {}),
        lastPlayedTimestamps: JSON.stringify(
          localData.lastPlayedTimestamps || {},
        ),
        activeDownloads: JSON.stringify(localData.activeDownloads || {}),
        downloadedGames: JSON.stringify(localData.downloadedGames || {}),
        settings: JSON.stringify(localData.settings || {}),
        migrationVersion: localData.migrationVersion || 1,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from(USER_DATA_TABLE)
        .upsert(payload, { onConflict: "user_id" });

      if (upsertError) throw upsertError;

      setLastSynced(new Date());
      console.log(
        `[Sync] Combined data successfully ${pushOnly ? "pushed" : "synced"} to Supabase.`,
      );
    } catch (error: any) {
      console.error("[Sync] Failed to sync data:", error);
      notifications.show({
        title: "Sync Failed",
        message:
          "Could not sync data to cloud. Please check your internet connection.",
        color: "red",
      });
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  };

  useEffect(() => {
    const runInitialSync = async () => {
      if (user) {
        await sync();
      }
      setInitialSyncDone(true);
    };
    runInitialSync();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const cleanup = (window as any).electron.onUserDataUpdated(() => {
      console.log("[Sync] Local data change detected. Triggering sync...");
      const timer = setTimeout(() => {
        sync(true);
      }, 2000);
      return () => clearTimeout(timer);
    });

    return () => cleanup();
  }, [user?.id]);

  return (
    <SyncContext.Provider
      value={{ syncing, lastSynced, initialSyncDone, sync }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
