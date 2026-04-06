import { ipcMain, BrowserWindow, app } from "electron";
import userData, { UserSettings } from "../services/userDataService";
import path from "path";
import DownloadManager from "../services/downloadManagerService";

export function registerDownloadHandlers(
  mainWindow: BrowserWindow,
  downloadManager: DownloadManager,
): void {
  ipcMain.handle("get-settings", async () => {
    return await userData.getData("settings");
  });

  ipcMain.handle(
    "update-settings",
    async (_event, newSettings: Partial<UserSettings>) => {
      if (typeof newSettings.runOnStartup === "boolean") {
        app.setLoginItemSettings({ openAtLogin: newSettings.runOnStartup });
      }
      const settings = (await userData.getData("settings")) || {};
      return await userData.setData("settings", {
        ...settings,
        ...newSettings,
      });
    },
  );

  ipcMain.handle(
    "start-download",
    async (
      _event,
      {
        gameId,
        provider,
        links,
        folder,
        selectedLinks,
        partSizes,
        repackSize,
      }: {
        gameId: string;
        provider: string;
        links: string[];
        folder?: string;
        selectedLinks: boolean[];
        partSizes: Record<string, number>;
        repackSize: string;
      },
    ) => {
      let downloadFolder = folder;
      if (!downloadFolder) {
        const settings = await userData.getData("settings");
        downloadFolder = path.join(settings.downloadDirectory, gameId);
      }
      return downloadManager.startDownload(
        gameId,
        provider,
        links,
        downloadFolder,
        selectedLinks,
        partSizes,
        repackSize,
      );
    },
  );

  ipcMain.handle("pause-download", async (_event, gameId: string) => {
    return downloadManager.pauseDownload(gameId);
  });

  ipcMain.handle("resume-download", async (_event, gameId: string) => {
    return downloadManager.resumeDownload(gameId);
  });

  ipcMain.handle(
    "delete-download",
    async (
      _event,
      { gameId, removeFiles }: { gameId: string; removeFiles: boolean },
    ) => {
      return downloadManager.deleteDownload(gameId, removeFiles);
    },
  );

  ipcMain.handle("get-active-downloads", () => {
    return downloadManager.activeDownloads;
  });

  ipcMain.handle(
    "toggle-optional-file",
    async (
      _event,
      {
        gameId,
        index,
        enabled,
      }: { gameId: string; index: number; enabled: boolean },
    ) => {
      const download = downloadManager.activeDownloads[gameId];
      if (!download) return { success: false };
      download.selectedLinks[index] = enabled;
      downloadManager.calculateOverallProgress(gameId);
      downloadManager.saveState();
      downloadManager.notifyProgress(gameId);

      if (enabled && (download.status as string) === "completed") {
        download.status = "preparing";
        downloadManager.runDownloadLoop(gameId);
      }
      return { success: true };
    },
  );

  ipcMain.handle("validate-links", async (_event, links: string[]) => {
    return downloadManager.validateLinks(links);
  });

  ipcMain.handle(
    "launch-installer",
    async (_event, folderPath: string, options: any) => {
      return downloadManager.launchInstaller(folderPath, options || {});
    },
  );
}
