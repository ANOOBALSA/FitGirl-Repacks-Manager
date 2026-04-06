import { net, BrowserWindow, shell, app } from "electron";
import fs from "fs-extra";
import path from "path";
import FuckingFastHandler from "../handlers/fuckingFastHandler";
import userData from "./userDataService";

export interface DownloadState {
  status:
    | "preparing"
    | "fetching_link"
    | "downloading"
    | "paused"
    | "error"
    | "unpacking"
    | "completed"
    | "deleted";
  provider: string;
  progress: number;
  totalParts: number;
  currentPart: number;
  folder: string;
  links: string[];
  selectedLinks: boolean[];
  partProgress: number[];
  partDownloaded: number[];
  partTotal: number[];
  repackTotalSize: number;
  speed: number;
  speedHistory: { time: number; speed: number }[];
  downloadedSize: number;
  totalSize: number;
  error?: string;
}

export interface ProgressData {
  progress: number;
  downloaded: number;
  total: number;
  speed: number;
}

class DownloadManager {
  private mainWindow: BrowserWindow;
  public activeDownloads: Record<string, DownloadState> = {};
  private currentRequests: Record<string, any> = {};
  private ffHandler: FuckingFastHandler;
  private speedInterval: NodeJS.Timeout | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.ffHandler = new FuckingFastHandler(mainWindow);
    this.loadState();
  }

  parseSize(sizeStr: string): number {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.,]+)\s*(GB|MB|KB|B)/i);
    if (!match) return 0;
    const value = parseFloat(match[1].replace(",", ""));
    const unit = match[2].toUpperCase();
    if (unit === "GB") return Math.floor(value * 1024 * 1024 * 1024);
    if (unit === "MB") return Math.floor(value * 1024 * 1024);
    if (unit === "KB") return Math.floor(value * 1024);
    return Math.floor(value);
  }

  async loadState(): Promise<void> {
    try {
      const data = await userData.getData();
      this.activeDownloads =
        (data.activeDownloads as Record<string, DownloadState>) || {};

      for (const gameId in this.activeDownloads) {
        const download = this.activeDownloads[gameId];
        if (
          download.status === "downloading" ||
          download.status === "preparing" ||
          download.status === "fetching_link"
        ) {
          download.status = "preparing";
          this.runDownloadLoop(gameId);
        }
      }
      this.mainWindow.webContents.send(
        "active-downloads-loaded",
        this.activeDownloads,
      );
    } catch (err) {
      console.error("[DownloadManager] Load state error:", err);
    }
  }

  async saveState(): Promise<void> {
    try {
      await userData.setData("activeDownloads", this.activeDownloads);
    } catch (err) {
      console.error("[DownloadManager] Save state error:", err);
    }
  }

  async validateLinks(links: string[]) {
    return await this.ffHandler.validateLinks(links);
  }

  async startDownload(
    gameId: string,
    provider: string,
    links: string[],
    folder: string,
    selectedLinks: boolean[],
    partSizes: Record<string, number>,
    repackSize: string,
  ) {
    for (const id in this.activeDownloads) {
      if (id !== gameId && this.activeDownloads[id].status === "downloading") {
        await this.pauseDownload(id);
      }
    }

    if (this.activeDownloads[gameId]) {
      this.activeDownloads[gameId].status = "preparing";
      if (selectedLinks)
        this.activeDownloads[gameId].selectedLinks = selectedLinks;
      if (provider) this.activeDownloads[gameId].provider = provider;
      this.runDownloadLoop(gameId);
      return { success: true };
    }

    try {
      await fs.ensureDir(folder);

      this.activeDownloads[gameId] = {
        status: "preparing",
        provider: provider || "Unknown",
        progress: 0,
        totalParts: links.length,
        currentPart: 0,
        folder: folder,
        links: links,
        selectedLinks: selectedLinks || Array(links.length).fill(true),
        partProgress: Array(links.length).fill(0),
        partDownloaded: Array(links.length).fill(0),
        partTotal: links.map((link) => partSizes?.[link] || 0),
        repackTotalSize: this.parseSize(repackSize),
        speed: 0,
        speedHistory: [],
        downloadedSize: 0,
        totalSize: 0,
      };

      this.calculateOverallProgress(gameId);
      this.notifyProgress(gameId);
      this.saveState();
      this.runDownloadLoop(gameId);

      return { success: true };
    } catch (err: any) {
      console.error("[DownloadManager] Failed to start:", err);
      return { success: false, error: err.message };
    }
  }

  async pauseDownload(gameId: string) {
    const download = this.activeDownloads[gameId];
    if (!download || download.status !== "downloading")
      return { success: false };

    if (this.currentRequests[gameId]) {
      this.currentRequests[gameId].abort();
      delete this.currentRequests[gameId];
    }

    download.status = "paused";
    this.notifyProgress(gameId);
    this.saveState();
    return { success: true };
  }

  async resumeDownload(gameId: string) {
    for (const id in this.activeDownloads) {
      if (id !== gameId && this.activeDownloads[id].status === "downloading") {
        await this.pauseDownload(id);
      }
    }

    const download = this.activeDownloads[gameId];
    if (
      !download ||
      (download.status !== "paused" && download.status !== "error")
    )
      return { success: false };

    download.status = "preparing";
    this.notifyProgress(gameId);
    this.saveState();
    this.runDownloadLoop(gameId);
    return { success: true };
  }

  async deleteDownload(gameId: string, removeFiles: boolean) {
    const download = this.activeDownloads[gameId];

    if (this.currentRequests[gameId]) {
      this.currentRequests[gameId].abort();
      delete this.currentRequests[gameId];
    }

    const folder = download?.folder;
    if (download) {
      download.status = "deleted";
      this.notifyProgress(gameId);
    }
    delete this.activeDownloads[gameId];

    if (removeFiles && folder) {
      try {
        await fs.remove(folder);
      } catch (err) {
        console.error("[DownloadManager] Clear files error:", err);
      }
    }

    const data = await userData.getData();
    if (data.downloadedGames?.[gameId]) {
      delete data.downloadedGames[gameId];
      await userData.saveData();
      this.mainWindow.webContents.send("user-data-updated");
    }

    this.saveState();
    return { success: true };
  }

  async runDownloadLoop(gameId: string) {
    const download = this.activeDownloads[gameId];
    if (!download) return;

    this.startSpeedTracking(gameId);

    try {
      for (let i = 0; i < download.links.length; i++) {
        if (!download.selectedLinks[i]) continue;
        if (download.partProgress[i] === 1) continue;

        if (download.status === "paused" || !this.activeDownloads[gameId])
          break;

        download.currentPart = i + 1;
        download.status = "fetching_link";
        this.notifyProgress(gameId);

        const downloadUrl = await this.ffHandler.getDownloadUrl(
          download.links[i],
        );

        if (
          (download.status as string) === "paused" ||
          !this.activeDownloads[gameId]
        )
          break;

        download.status = "downloading";
        this.notifyProgress(gameId);

        const fileName =
          this.getFileNameFromUrl(download.links[i]) || `part${i + 1}.rar`;
        const filePath = path.join(download.folder, fileName);

        let startByte = 0;
        if (await fs.pathExists(filePath)) {
          const stats = await fs.stat(filePath);
          startByte = stats.size;
        }

        await this.downloadFile(
          gameId,
          downloadUrl,
          filePath,
          startByte,
          (progressData: ProgressData) => {
            download.partProgress[i] = progressData.progress;
            download.partDownloaded[i] = progressData.downloaded;
            download.partTotal[i] = progressData.total;

            this.calculateOverallProgress(gameId);
            download.speed = progressData.speed;

            this.notifyProgress(gameId);
            if (download.progress % 5 === 0) this.saveState();
          },
        );

        if ((download.status as string) === "paused") break;
      }

      this.stopSpeedTracking();

      let allSelectedDone = true;
      for (let i = 0; i < download.links.length; i++) {
        if (download.selectedLinks[i] && download.partProgress[i] < 1) {
          allSelectedDone = false;
          break;
        }
      }

      if (download.status === "downloading" && allSelectedDone) {
        download.status = "unpacking";
        this.notifyProgress(gameId);

        const settings = (await userData.getData("settings")) as any;
        if (settings.unpackAfterDownload) {
          try {
            await this.unpackRarFiles(gameId);
          } catch (unpackErr) {
            console.error("[DownloadManager] Unpack error:", unpackErr);
          }
        }

        download.status = "completed";
        this.notifyProgress(gameId);

        const data = await userData.getData();
        if (!data.downloadedGames) data.downloadedGames = {};
        data.downloadedGames[gameId] = download.folder;

        if (!data.userGames[gameId]) data.userGames[gameId] = [];
        if (!data.userGames[gameId].includes("downloaded")) {
          data.userGames[gameId] = data.userGames[gameId].filter(
            (s: string) => s !== "wishlist",
          );
          data.userGames[gameId].push("downloaded");
        }

        await userData.saveData();
        this.saveState();
        this.mainWindow.webContents.send("user-data-updated");
      }
    } catch (err: any) {
      this.stopSpeedTracking();
      if (err.message === "Aborted") return;
      console.error(`[DownloadManager] Error for ${gameId}:`, err);
      if (this.activeDownloads[gameId]) {
        this.activeDownloads[gameId].status = "error";
        this.activeDownloads[gameId].error = err.message;
        this.notifyProgress(gameId);
      }
    }
  }

  calculateOverallProgress(gameId: string) {
    const download = this.activeDownloads[gameId];
    if (!download) return;

    let totalDownloaded = 0;
    let totalKnownSize = 0;
    let unknownSizeParts = 0;
    let selectedPartsCount = 0;

    for (let i = 0; i < download.links.length; i++) {
      if (download.selectedLinks[i]) {
        selectedPartsCount++;
        totalDownloaded += download.partDownloaded[i] || 0;

        if (download.partTotal[i]) {
          totalKnownSize += download.partTotal[i];
        } else {
          unknownSizeParts++;
        }
      }
    }

    let finalTotalSize = totalKnownSize;

    if (unknownSizeParts > 0) {
      if (download.repackTotalSize > finalTotalSize) {
        finalTotalSize = download.repackTotalSize;
      } else if (totalKnownSize > 0) {
        const avgPartSize =
          totalKnownSize / (selectedPartsCount - unknownSizeParts);
        finalTotalSize = totalKnownSize + unknownSizeParts * avgPartSize;
      }
    }

    download.downloadedSize = totalDownloaded;
    download.totalSize = finalTotalSize;

    if (finalTotalSize > 0) {
      download.progress = Math.round((totalDownloaded / finalTotalSize) * 100);
    } else {
      let sum = 0;
      for (let i = 0; i < download.links.length; i++) {
        if (download.selectedLinks[i]) {
          sum += download.partProgress[i] || 0;
        }
      }
      download.progress =
        selectedPartsCount > 0
          ? Math.round((sum / selectedPartsCount) * 100)
          : 0;
    }
  }

  startSpeedTracking(gameId: string) {
    this.stopSpeedTracking();
    this.speedInterval = setInterval(() => {
      const download = this.activeDownloads[gameId];
      if (download && download.status === "downloading") {
        download.speedHistory = download.speedHistory || [];
        download.speedHistory.push({
          time: Date.now(),
          speed: download.speed,
        });
        if (download.speedHistory.length > 60) {
          download.speedHistory.shift();
        }
        this.notifyProgress(gameId);
      }
    }, 1000);
  }

  stopSpeedTracking() {
    if (this.speedInterval) {
      clearInterval(this.speedInterval);
      this.speedInterval = null;
    }
  }

  async unpackRarFiles(gameId: string): Promise<void> {
    const download = this.activeDownloads[gameId];
    if (!download) return;

    const files = await fs.readdir(download.folder);
    const rarFiles = files
      .filter((f) => f.toLowerCase().endsWith(".rar"))
      .sort()
      .map((f) => path.join(download.folder, f));

    if (rarFiles.length === 0) {
      console.log("[Unpacker] No RAR files found to unpack");
      return;
    }

    const firstParts = rarFiles.filter(
      (f) =>
        f.toLowerCase().includes(".part1.rar") ||
        f.toLowerCase().includes(".part01.rar") ||
        (!f.toLowerCase().includes(".part") &&
          f.toLowerCase().endsWith(".rar")),
    );

    if (firstParts.length === 0 && rarFiles.length > 0) {
      firstParts.push(rarFiles[0]);
    }

    console.log(
      `[Unpacker] Found ${firstParts.length} RAR sequences to unpack.`,
    );

    for (const firstPart of firstParts) {
      console.log(
        `[Unpacker] Starting extraction for: ${path.basename(firstPart)}`,
      );
      try {
        const { createExtractorFromFile } = require("node-unrar-js");
        const extractor = await createExtractorFromFile({
          filepath: firstPart,
          targetPath: download.folder,
        });
        const { files: extracted } = extractor.extract();
        for (const f of extracted) {
        }
        console.log(
          `[Unpacker] Extraction successful via node-unrar-js: ${path.basename(firstPart)}`,
        );
        continue;
      } catch (err: any) {
        console.warn(
          `[Unpacker] node-unrar-js failed for ${path.basename(firstPart)}:`,
          err.message,
        );
      }

      try {
        const { spawn } = require("child_process");
        await new Promise<void>((resolve, reject) => {
          const proc = spawn(
            "C:\\Program Files\\WinRAR\\UnRAR.exe",
            ["x", firstPart, download.folder + "\\", "-y"],
            { stdio: "pipe" },
          );
          let stderr = "";
          proc.stderr?.on("data", (d: any) => (stderr += d.toString()));
          proc.on("error", (e: any) => reject(new Error(e.message)));
          proc.on("close", (code: number) =>
            code === 0
              ? resolve()
              : reject(new Error(`WinRAR exited ${code}. ${stderr}`)),
          );
        });
        console.log(
          `[Unpacker] Extraction successful via WinRAR: ${path.basename(firstPart)}`,
        );
      } catch (err2: any) {
        console.error(
          `[Unpacker] Extraction FAILED for ${path.basename(firstPart)}:`,
          err2.message,
        );
      }
    }
  }

  getFileNameFromUrl(url: string): string | null {
    try {
      if (url.includes("#")) {
        return url.split("#")[1];
      }
      const parts = url.split("/");
      return parts[parts.length - 1];
    } catch (e) {
      return null;
    }
  }

  downloadFile(
    gameId: string,
    url: string,
    targetPath: string,
    startByte: number,
    onProgress: (data: ProgressData) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        method: "GET",
        headers: {} as Record<string, string>,
      };

      if (startByte > 0) {
        options.headers["Range"] = `bytes=${startByte}-`;
      }

      const request = net.request({ url, ...options });
      this.currentRequests[gameId] = request;

      let lastTime = Date.now();
      let lastBytes = 0;

      request.on("response", (response) => {
        const isPartial = response.statusCode === 206;
        const contentLength =
          parseInt(response.headers["content-length"] as string, 10) || 0;
        const totalSize = contentLength + (isPartial ? startByte : 0);
        let downloadedSize = startByte;

        const fileStream = fs.createWriteStream(targetPath, {
          flags: startByte > 0 ? "a" : "w",
        });

        response.on("data", (chunk: Buffer) => {
          downloadedSize += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          const delta = now - lastTime;
          if (delta >= 1000) {
            const speed =
              (downloadedSize - startByte - lastBytes) / (delta / 1000);
            lastBytes = downloadedSize - startByte;
            lastTime = now;

            onProgress({
              progress: totalSize ? downloadedSize / totalSize : 0,
              downloaded: downloadedSize,
              total: totalSize,
              speed: speed,
            });
          } else if (downloadedSize === totalSize) {
            onProgress({
              progress: 1,
              downloaded: downloadedSize,
              total: totalSize,
              speed: 0,
            });
          }
        });

        response.on("end", () => {
          fileStream.end();
          delete this.currentRequests[gameId];
          resolve();
        });

        response.on("error", (err) => {
          fileStream.close();
          delete this.currentRequests[gameId];
          reject(err);
        });
      });

      request.on("error", (err) => {
        delete this.currentRequests[gameId];
        reject(err);
      });

      request.on("abort", () => {
        delete this.currentRequests[gameId];
        reject(new Error("Aborted"));
      });

      request.end();
    });
  }

  async launchInstaller(
    folderPath: string,
    options: { silent?: boolean; installDir?: string | null } = {},
  ) {
    const { spawn } = require("child_process");
    const { silent = false } = options;
    let { installDir = null } = options;

    if (silent && !installDir) {
      const data = await userData.getData();
      if ((data.settings as any)?.defaultInstallDirectory) {
        installDir = (data.settings as any).defaultInstallDirectory;
      }
    }

    const files = await fs.readdir(folderPath);
    const setupFile = files.find(
      (f) =>
        f.toLowerCase().startsWith("setup") && f.toLowerCase().endsWith(".exe"),
    );

    if (!setupFile) {
      throw new Error("Could not find setup.exe in " + folderPath);
    }

    const exePath = path.join(folderPath, setupFile);

    const getDesktopShortcuts = async () => {
      try {
        const desktop = app.getPath("desktop");
        const publicDesktop = process.env.PUBLIC
          ? path.join(process.env.PUBLIC, "Desktop")
          : null;
        const dirs = [desktop];
        if (publicDesktop) dirs.push(publicDesktop);

        const allShortcuts: string[] = [];
        for (const dir of dirs) {
          try {
            const list = await fs.readdir(dir);
            allShortcuts.push(
              ...list
                .filter((f) => f.toLowerCase().endsWith(".lnk"))
                .map((f) => path.join(dir, f)),
            );
          } catch (e) {}
        }
        return allShortcuts;
      } catch (e) {
        return [];
      }
    };

    const beforeShortcuts = await getDesktopShortcuts();

    const tryInstall = (args: string[]) =>
      new Promise<number | void>((resolve, reject) => {
        const cmdStr = `start /wait "" "${exePath}" ${args.join(" ")}`;
        const proc = spawn(cmdStr, [], {
          cwd: folderPath,
          stdio: "ignore",
          shell: true,
        });
        proc.on("error", (e: any) => reject(e));
        proc.on("close", (code: number) => resolve(code));
      });

    let method = "normal";

    const dirFlag = installDir ? `/DIR="${installDir}"` : null;
    if (silent) {
      const innoArgs = [
        "/VERYSILENT",
        "/SP-",
        "/SUPPRESSMSGBOXES",
        "/NORESTART",
        "/NOMUSIC",
        ...(dirFlag ? [dirFlag] : []),
      ];
      const nsisArgs = ["/S", ...(installDir ? [`/D=${installDir}`] : [])];

      try {
        await tryInstall(innoArgs);
        method = "innosetup";
      } catch (e1) {
        try {
          await tryInstall(nsisArgs);
          method = "nsis";
        } catch (e2) {
          await tryInstall([]);
          method = "normal";
        }
      }
    } else {
      await tryInstall([dirFlag || ""]);
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const afterShortcuts = await getDesktopShortcuts();
    const newShortcuts = afterShortcuts.filter(
      (s) => !beforeShortcuts.includes(s),
    );

    let detectedExe: string | null = null;
    if (newShortcuts.length > 0) {
      for (const s of newShortcuts) {
        try {
          const target = shell.readShortcutLink(s).target;
          if (target && target.toLowerCase().endsWith(".exe")) {
            detectedExe = target;
            break;
          }
        } catch (e) {}
      }
    }

    if (!detectedExe && installDir) {
      const findExecutable = async (
        dir: string,
        depth = 0,
      ): Promise<{ path: string; size: number } | null> => {
        if (depth > 3) return null;
        try {
          const items = await fs.readdir(dir, { withFileTypes: true });
          let bestExe: string | null = null;
          let bestSize = 0;

          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            const lowerName = item.name.toLowerCase();

            if (item.isDirectory()) {
              if (
                [
                  "_redist",
                  "redist",
                  "directx",
                  "vcredist",
                  "bonus",
                  "soundtrack",
                ].includes(lowerName)
              )
                continue;

              const subExe = await findExecutable(fullPath, depth + 1);
              if (subExe && subExe.size > bestSize) {
                bestExe = subExe.path;
                bestSize = subExe.size;
              }
            } else if (item.isFile() && lowerName.endsWith(".exe")) {
              if (
                lowerName.includes("unins") ||
                lowerName.includes("crash") ||
                lowerName.includes("dxwebsetup") ||
                lowerName.includes("vcredist")
              )
                continue;

              const stats = await fs.stat(fullPath);
              if (stats.size > bestSize) {
                bestExe = fullPath;
                bestSize = stats.size;
              }
            }
          }
          return bestExe ? { path: bestExe, size: bestSize } : null;
        } catch (e) {
          return null;
        }
      };

      const result = await findExecutable(installDir);
      if (result && result.path) {
        detectedExe = result.path;
      }
    }

    return { success: true, method, newExePath: detectedExe };
  }

  notifyProgress(gameId: string) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send("download-progress", {
        gameId,
        ...this.activeDownloads[gameId],
      });
    }
  }
}

export default DownloadManager;
