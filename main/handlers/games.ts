import { ipcMain, BrowserWindow } from "electron";
import * as gameDetector from "../services/gameDetectorService";
import path from "path";
import { spawn, exec } from "child_process";
import fs from "fs-extra";
import userData from "../services/userDataService";
import DownloadManager from "../services/downloadManagerService";

let activeGameId: string | null = null;
let playTimeInterval: NodeJS.Timeout | null = null;
let currentSessionMinutes = 0;

export function registerGameHandlers(
  mainWindow: BrowserWindow,
  downloadManager: DownloadManager,
  updateJumpList?: () => void,
): void {
  ipcMain.handle("scan-games", async (_event, folderPath: string) => {
    const data = await userData.getData();
    const normalize = (p: string) => p.replace(/\\/g, "/").toLowerCase();

    const existingPaths = new Set(
      Object.values(data.gamePaths || {}).map((p: any) => normalize(String(p))),
    );

    console.log(`[Scan] Scanning ${folderPath}`);
    console.log(`[Scan] Existing paths count: ${existingPaths.size}`);
    if (existingPaths.size > 0) {
      console.log(
        `[Scan] Sample existing paths: ${Array.from(existingPaths).slice(0, 3).join(", ")}`,
      );
    }

    const detectedGames = await gameDetector.scanForGames(folderPath);

    const filtered = detectedGames.filter((game) => {
      const isExisting = game.executables.some((exe) => {
        const normalizedPath = normalize(exe.path);
        return existingPaths.has(normalizedPath);
      });

      if (isExisting) {
        console.log(
          `[Scan] Hiding already-added game (any EXE match): ${game.detectedName}`,
        );
      }
      return !isExisting;
    });

    console.log(
      `[Scan] Returning ${filtered.length} games (from ${detectedGames.length} detected)`,
    );
    return filtered;
  });

  ipcMain.handle("launch-game", async (_event, exePath: string) => {
    return await launchGameAction(mainWindow, exePath, updateJumpList);
  });

  ipcMain.handle("get-active-game", () => activeGameId);

  ipcMain.handle("uninstall-game", async (_event, exePath: string) => {
    try {
      const installDir = path.dirname(exePath);
      const files = await fs.readdir(installDir);
      const uninsFile = files.find(
        (f) =>
          f.toLowerCase().startsWith("unins") &&
          f.toLowerCase().endsWith(".exe"),
      );
      if (!uninsFile) return { success: false, error: "Uninstaller not found" };

      const uninsPath = path.join(installDir, uninsFile);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(`start /wait "" "${uninsPath}"`, [], {
          cwd: installDir,
          stdio: "ignore",
          shell: true,
        });
        proc.on("error", reject);
        proc.on("close", () => {
          if (mainWindow) {
            mainWindow.webContents.send("user-data-updated");
          }
          resolve();
        });
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("list-download-files", async (_event, folderPath: string) => {
    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      const stats = await Promise.all(
        entries.map(async (e) => {
          const full = path.join(folderPath, e.name);
          const stat = await fs.stat(full).catch(() => null);
          return {
            name: e.name,
            isDir: e.isDirectory(),
            size: stat?.size || 0,
          };
        }),
      );
      return { success: true, files: stats };
    } catch (err: any) {
      return { success: false, error: err.message, files: [] };
    }
  });

  ipcMain.handle(
    "check-installer-exists",
    async (_event, folderPath: string) => {
      try {
        const files = await fs.readdir(folderPath);
        const found = files.some(
          (f) =>
            f.toLowerCase().startsWith("setup") &&
            f.toLowerCase().endsWith(".exe"),
        );
        return { exists: found };
      } catch {
        return { exists: false };
      }
    },
  );

  ipcMain.handle("unpack-download-rars", async (_event, gameId: string) => {
    try {
      if (downloadManager) {
        await downloadManager.unpackRarFiles(gameId);
        return { success: true };
      }
      return { success: false, error: "Download manager not available" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("delete-download-rars", async (_event, folderPath: string) => {
    try {
      const files = await fs.readdir(folderPath);
      const rars = files.filter((f) => f.toLowerCase().endsWith(".rar"));
      for (const f of rars) {
        await fs.remove(path.join(folderPath, f));
      }
      return { success: true, deleted: rars.length };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(
    "delete-install-files",
    async (
      _event,
      { gameId, folderPath }: { gameId: string; folderPath: string },
    ) => {
      try {
        await fs.remove(folderPath);
        const data = await userData.getData();
        let changed = false;

        if (data.downloadedGames && data.downloadedGames[gameId]) {
          delete data.downloadedGames[gameId];
          changed = true;
        }

        if (data.activeDownloads && data.activeDownloads[gameId]) {
          delete data.activeDownloads[gameId];
          changed = true;
          mainWindow?.webContents.send("download-progress", {
            gameId,
            status: "deleted",
          });
        }

        if (changed) {
          await userData.saveData();
          mainWindow?.webContents.send("user-data-updated");
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  );
}

export async function launchGameAction(
  mainWindow: BrowserWindow,
  exePath: string,
  updateJumpList?: () => void,
): Promise<boolean> {
  if (activeGameId !== null) {
    console.log("[Launch] Blocked: A game is already running.");
    return false;
  }

  const gameDir = path.dirname(exePath);

  const isDs4Running = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      exec('tasklist /FI "IMAGENAME eq DS4Windows.exe"', (_err, stdout) => {
        resolve(stdout.includes("DS4Windows.exe"));
      });
    });
  };

  let didStartDs4 = false;
  let detectedGameId: string | null = null;

  try {
    const data = await userData.getData();
    detectedGameId =
      Object.keys(data.gamePaths as Record<string, string>).find(
        (id) => (data.gamePaths as Record<string, string>)[id] === exePath,
      ) || null;

    if (
      detectedGameId &&
      (data.gameDs4Settings as Record<string, boolean>)[detectedGameId] &&
      data.settings.ds4WindowsPath
    ) {
      const running = await isDs4Running();
      if (!running) {
        console.log(
          `[Launch] Starting DS4Windows: ${data.settings.ds4WindowsPath}`,
        );
        const ds4 = spawn(`"${data.settings.ds4WindowsPath}"`, [], {
          detached: true,
          stdio: "ignore",
          shell: true,
        });
        ds4.on("error", (err) =>
          console.error("[Launch] DS4Windows spawn error:", err),
        );
        ds4.unref();
        didStartDs4 = true;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } catch (err) {
    console.error("[Launch] Failed to handle DS4 settings", err);
  }

  console.log(`[Launch] Starting game: ${exePath}`);
  activeGameId = detectedGameId || "unknown";
  mainWindow?.webContents.send("game-status-updated", {
    running: true,
    gameId: activeGameId,
  });

  const startTime = Date.now();

  const child = spawn(`"${exePath}"`, [], {
    cwd: gameDir,
    detached: true,
    stdio: "ignore",
    shell: true,
  });

  currentSessionMinutes = 0;
  if (playTimeInterval) clearInterval(playTimeInterval);

  playTimeInterval = setInterval(async () => {
    currentSessionMinutes++;

    if (currentSessionMinutes % 5 === 0) {
      try {
        const data = await userData.getData();
        if (detectedGameId) {
          if (!data.playTime) data.playTime = {};
          (data.playTime as Record<string, number>)[detectedGameId] =
            ((data.playTime as Record<string, number>)[detectedGameId] || 0) +
            5;
          await userData.saveData();
          mainWindow?.webContents.send("user-data-updated");
        }
      } catch (err) {
        console.error("[PlayTime] Periodic save failed:", err);
      }
    }
  }, 60000);

  child.on("error", (err) => {
    console.error("[Launch] Game spawn error:", err);
    activeGameId = null;
    if (playTimeInterval) {
      clearInterval(playTimeInterval);
      playTimeInterval = null;
    }
    mainWindow?.webContents.send("game-status-updated", { running: false });
  });

  child.on("exit", async () => {
    console.log("[Launch] game exited");

    activeGameId = null;
    if (playTimeInterval) {
      clearInterval(playTimeInterval);
      playTimeInterval = null;
    }
    mainWindow?.webContents.send("game-status-updated", { running: false });

    if (didStartDs4) {
      console.log("[Launch] Closing DS4Windows as requested...");
      exec("taskkill /F /IM DS4Windows.exe", (error) => {
        if (error) {
          console.error("[Launch] Failed to close DS4Windows:", error);
        } else {
          console.log("[Launch] DS4Windows closed successfully.");
        }
      });
    }

    const remainingMinutes = currentSessionMinutes % 5;
    console.log(
      `Session total mins: ${currentSessionMinutes}, saving remaining: ${remainingMinutes}`,
    );

    if (currentSessionMinutes > 0) {
      try {
        const data = await userData.getData();
        const gameId = Object.keys(
          data.gamePaths as Record<string, string>,
        ).find(
          (id) => (data.gamePaths as Record<string, string>)[id] === exePath,
        );
        if (gameId) {
          if (!data.playTime) data.playTime = {};

          (data.playTime as Record<string, number>)[gameId] =
            ((data.playTime as Record<string, number>)[gameId] || 0) +
            (currentSessionMinutes % 5);

          if (!data.lastPlayedTimestamps) data.lastPlayedTimestamps = {};
          (data.lastPlayedTimestamps as Record<string, number>)[gameId] =
            Date.now();

          await userData.saveData();
          mainWindow?.webContents.send("user-data-updated");
          if (updateJumpList) updateJumpList();
        }
      } catch (err) {
        console.error("[Launch] Failed to save playtime", err);
      }
    }
  });

  child.unref();
  return true;
}
