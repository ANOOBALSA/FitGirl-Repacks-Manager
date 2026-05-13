import { app, shell } from "electron";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

export const GITHUB_OWNER = "ANOOBALSA";
export const GITHUB_REPO = "FitGirl-Repacks-Manager";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export interface ReleaseInfo {
  version: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  assetName: string;
  htmlUrl: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  release: ReleaseInfo | null;
  isDownloaded: boolean;
  downloadedPath: string | null;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  speed: number; // bytes/sec
}

let activeDownload: {
  cancel: () => void;
  destPath: string;
} | null = null;

/** Compare semver strings. Returns true if `latest` is newer than `current`. */
function isNewer(current: string, latest: string): boolean {
  const normalize = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [cMaj, cMin, cPat] = normalize(current);
  const [lMaj, lMin, lPat] = normalize(latest);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion();

  const response = await fetch(GITHUB_API_URL, {
    headers: {
      "User-Agent": `FitGirl-Repacks-Manager/${currentVersion}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as any;
  const latestVersion: string = (data.tag_name as string).replace(/^v/, "");

  // Find the first .exe asset
  const asset = (data.assets as any[]).find((a: any) =>
    (a.name as string).toLowerCase().endsWith(".exe"),
  );

  const release: ReleaseInfo = {
    version: latestVersion,
    releaseNotes: data.body || "",
    publishedAt: data.published_at || "",
    downloadUrl: asset?.browser_download_url || data.html_url,
    assetName: asset?.name || "installer.exe",
    htmlUrl: data.html_url,
  };

  const updatesDir = path.join(app.getPath("userData"), "Updates");
  if (!fs.existsSync(updatesDir)) {
    fs.mkdirSync(updatesDir, { recursive: true });
  }

  const downloadedPath = path.join(updatesDir, release.assetName);
  const isDownloaded = fs.existsSync(downloadedPath);

  return {
    hasUpdate: isNewer(currentVersion, latestVersion),
    currentVersion,
    latestVersion,
    release,
    isDownloaded,
    downloadedPath: isDownloaded ? downloadedPath : null,
  };
}

export function downloadUpdate(
  url: string,
  assetName: string,
  onProgress: (progress: DownloadProgress) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const updatesDir = path.join(app.getPath("userData"), "Updates");
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }
    const destPath = path.join(updatesDir, assetName);

    // Check if it's already downloaded and return path immediately
    if (fs.existsSync(destPath)) {
      console.log(
        `[Updater] Installer already exists at ${destPath}, skipping download.`,
      );
      resolve(destPath);
      return;
    }

    const file = fs.createWriteStream(destPath);
    let cancelled = false;
    let startTime = Date.now();
    let lastTransferred = 0;
    let lastTime = Date.now();

    function doRequest(requestUrl: string, redirectDepth = 0) {
      if (redirectDepth > 10) {
        reject(new Error("Too many redirects"));
        return;
      }

      const proto = requestUrl.startsWith("https://") ? https : http;

      const req = proto.get(
        requestUrl,
        {
          headers: {
            "User-Agent": `FitGirl-Repacks-Manager/${app.getVersion()}`,
          },
        },
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            doRequest(res.headers.location, redirectDepth + 1);
            return;
          }

          if (res.statusCode !== 200) {
            file.close();
            reject(new Error(`Download failed: HTTP ${res.statusCode}`));
            return;
          }

          const total = parseInt(res.headers["content-length"] || "0", 10);
          let transferred = 0;
          let currentSpeed = 0;
          let lastUpdateTime = 0;

          res.on("data", (chunk: Buffer) => {
            if (cancelled) return;
            transferred += chunk.length;
            const now = Date.now();
            const elapsedSinceSpeedUpdate = (now - lastTime) / 1000;
            const elapsedSinceUIUpdate = now - lastUpdateTime;

            if (elapsedSinceSpeedUpdate >= 1.0) {
              currentSpeed =
                (transferred - lastTransferred) / elapsedSinceSpeedUpdate;
              lastTransferred = transferred;
              lastTime = now;
            }

            // Only update UI at most 10 times per second
            if (elapsedSinceUIUpdate >= 100 || transferred === total) {
              lastUpdateTime = now;
              const percent =
                total > 0 ? Math.round((transferred / total) * 100) : 0;

              onProgress({
                percent,
                transferred,
                total,
                speed: currentSpeed,
              });
            }
          });

          res.pipe(file);

          file.on("finish", () => {
            file.close();
            if (!cancelled) {
              activeDownload = null;
              resolve(destPath);
            }
          });

          file.on("error", (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
          });
        },
      );

      req.on("error", (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });

      activeDownload = {
        cancel: () => {
          cancelled = true;
          req.destroy();
          file.close();
          fs.unlink(destPath, () => {});
          activeDownload = null;
        },
        destPath,
      };
    }

    doRequest(url);
  });
}

export function cancelDownload(): boolean {
  if (activeDownload) {
    activeDownload.cancel();
    return true;
  }
  return false;
}

export function getDownloadedInstallerPath(): string | null {
  return activeDownload?.destPath ?? null;
}

export function launchInstaller(installerPath: string): void {
  console.log(`[Updater] Launching installer: ${installerPath}`);

  const { spawn } = require("child_process");
  try {
    const child = spawn(installerPath, [], {
      detached: true,
      stdio: "ignore",
      shell: true,
    });
    child.unref();

    console.log("[Updater] Installer launched via spawn. Quitting in 1s...");

    // Ensure app.quit() is not blocked by "close to tray" logic
    (app as any).isQuitting = true;

    // Give it a second to ensure the process is handed off to the OS
    setTimeout(() => {
      app.quit();
    }, 1000);
  } catch (err) {
    console.error("[Updater] Failed to launch installer via spawn:", err);
    // Fallback to shell.openPath if spawn fails
    shell.openPath(installerPath).then((openError) => {
      if (openError) {
        console.error("[Updater] Fallback shell.openPath also failed:", openError);
      }
      (app as any).isQuitting = true;
      app.quit();
    });
  }
}

/**
 * Consolidates the update check and notification logic.
 * This can be called by the main process or triggered via IPC from the renderer.
 */
export async function performUpdateCheck(mainWindow: any): Promise<void> {
  try {
    console.log("[Updater] Performing update check...");
    const result = await checkForUpdates();
    if (result.hasUpdate && result.release) {
      console.log(`[Updater] New update available: v${result.latestVersion}`);
      showUpdateNotification(result.latestVersion, mainWindow);

      // Notify the renderer to show the rich update modal
      if (mainWindow) {
        mainWindow.webContents.send("show-update-modal", result);
      }
    } else {
      console.log("[Updater] No new updates found.");
    }
  } catch (error) {
    console.error("[Updater] Update check failed:", error);
  }
}

/**
 * Starts the initial update check.
 * The background interval has been removed per user request.
 */

function showUpdateNotification(version: string, mainWindow: any): void {
  const { Notification } = require("electron");

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: "New Update Available!",
      body: `Version v${version} is now available on GitHub. Click to view details and update.`,
      icon: getAssetPath("app_icon.png"),
      silent: false,
    });

    notification.on("click", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("navigate-to-settings", {
          section: "updates",
        });
      }
    });

    notification.show();
  }
}

function getAssetPath(assetName: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "assets", assetName);
  }
  return path.join(app.getAppPath(), "public", assetName);
}
