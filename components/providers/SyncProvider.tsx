"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { pb } from "../../lib/pocketbase";
import { useAuth } from "./AuthProvider";
import { notifications } from "@mantine/notifications";

interface SyncContextType {
  syncing: boolean;
  lastSynced: Date | null;
  initialSyncDone: boolean;
  sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const USER_DATA_COLLECTION = "user_data";

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
          const data = await pb
            .collection(USER_DATA_COLLECTION)
            .getFirstListItem(`user = "${user.id}"`);

          if (data) {
            remoteData = {
              userGames: data.userGames || {},
              statusTimestamps: data.statusTimestamps || {},
              readRepacks: data.readRepacks || [],
              repackIgdbMapping: data.repackIgdbMapping || {},
              virtualGames: data.virtualGames || {},
              gamePaths: data.gamePaths || {},
              ds4Path: data.ds4Path || "",
              gameDs4Settings: data.gameDs4Settings || {},
              playTime: data.playTime || {},
              lastPlayedTimestamps: data.lastPlayedTimestamps || {},
              activeDownloads: data.activeDownloads || {},
              downloadedGames: data.downloadedGames || {},
              settings: data.settings || {},
              migrationVersion: data.migrationVersion || 1,
            };
          }
        } catch (e: any) {
          if (e.status !== 404) {
          }
        }

        if (remoteData) {
          await (window as any).electron.syncUserDataDown(remoteData);
        }
      }

      const localData = (await (window as any).electron.allUserData()) || {};

      const payload = {
        user: user.id,
        userGames: localData.userGames || {},
        statusTimestamps: localData.statusTimestamps || {},
        readRepacks: localData.readRepacks || [],
        repackIgdbMapping: localData.repackIgdbMapping || {},
        virtualGames: localData.virtualGames || {},
        gamePaths: localData.gamePaths || {},
        ds4Path: localData.ds4Path || "",
        gameDs4Settings: localData.gameDs4Settings || {},
        playTime: localData.playTime || {},
        lastPlayedTimestamps: localData.lastPlayedTimestamps || {},
        activeDownloads: localData.activeDownloads || {},
        downloadedGames: localData.downloadedGames || {},
        settings: localData.settings || {},
        migrationVersion: localData.migrationVersion || 1,
      };

      // Check if record exists for this user to update, or create a new one
      let existingRecord = null;
      try {
        existingRecord = await pb
          .collection(USER_DATA_COLLECTION)
          .getFirstListItem(`user = "${user.id}"`);
      } catch (e) {}

      if (existingRecord) {
        await pb
          .collection(USER_DATA_COLLECTION)
          .update(existingRecord.id, payload);
      } else {
        await pb.collection(USER_DATA_COLLECTION).create(payload);
      }

      setLastSynced(new Date());
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
