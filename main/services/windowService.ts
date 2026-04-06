import { BrowserWindow, app, session, ipcMain } from "electron";
import path from "path";
import { loadURL } from "../index";

import DownloadManager from "./downloadManagerService";
import { getAssetPath, isDev } from "../utils";
import userData from "./userDataService";

import { registerUserDataHandlers } from "../handlers/userData";
import { registerGameHandlers } from "../handlers/games";
import { registerDownloadHandlers } from "../handlers/downloads";
import { registerSystemHandlers } from "../handlers/system";
import { registerWindowHandlers } from "../handlers/window";
import { registerMapGenieHandlers } from "../handlers/mapgenie";

import trayService from "./trayService";
import * as jumpListService from "./jumpListService";
import { updateJumpList } from "./jumpListService";

let mainWindow: BrowserWindow | null = null;
let loadingWindow: BrowserWindow | null = null;
let downloadManager: DownloadManager | null = null;

let resolveReadySignal: () => void;
const readySignalPromise = new Promise<void>((resolve) => {
  resolveReadySignal = resolve;
});

ipcMain.on("window-show-main", () => {
  console.log("[Main] Received signal from renderer to show window.");
  if (resolveReadySignal) resolveReadySignal();
});

function createLoadingWindow(): void {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 450,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: getAssetPath("app_icon.png"),
  });

  loadingWindow.loadFile(getAssetPath("loading.html"));
  loadingWindow.on("closed", () => (loadingWindow = null));
}

export function createWindow(): BrowserWindow {
  console.log("[Main] Creating window...");
  createLoadingWindow();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    frame: false,
    show: false,
    icon: getAssetPath("app_icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "..", "preload.js"),
      webviewTag: true,
      devTools: isDev,
      partition: "persist:launcher",
    },
  });

  if (!isDev) {
    session
      .fromPartition("persist:launcher")
      .webRequest.onBeforeSendHeaders(
        { urls: ["https://www.youtube.com/embed/*"] },
        (details, callback) => {
          details.requestHeaders["Referer"] = "https://www.youtube.com/";
          callback({ requestHeaders: details.requestHeaders });
        },
      );
  }

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    loadURL(mainWindow);
  }

  const startTime = Date.now();
  const LOAD_FAILSAFE_TIMEOUT = 15000;

  const dataLoaded = Promise.resolve();

  const failsafePromise = new Promise((resolve) =>
    setTimeout(() => {
      console.warn("[Main] Failsafe timeout reached. Showing window.");
      resolve(true);
    }, LOAD_FAILSAFE_TIMEOUT),
  );

  const windowLoadedPromise = new Promise((resolve) => {
    mainWindow!.webContents.once("did-finish-load", () => {
      resolve(true);
    });
  });

  Promise.all([
    windowLoadedPromise,
    Promise.race([readySignalPromise, failsafePromise]),
  ]).then(async () => {
    if (loadingWindow) {
      loadingWindow.close();
      loadingWindow = null;
    }
    if (mainWindow) {
      const settings = (await userData.getData()).settings;
      if (settings.startMinimized) {
        console.log("[Main] Starting minimized to tray");
        mainWindow.hide();
      } else {
        mainWindow.maximize();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  if (!trayService.getTray()) {
    trayService.createTray(mainWindow, () => updateJumpList(mainWindow!));
  }
  updateJumpList(mainWindow);

  downloadManager = new DownloadManager(mainWindow);

  registerUserDataHandlers(mainWindow, () => updateJumpList(mainWindow!));
  registerGameHandlers(mainWindow, downloadManager, () =>
    updateJumpList(mainWindow!),
  );
  registerDownloadHandlers(mainWindow, downloadManager);
  registerSystemHandlers(mainWindow);
  registerWindowHandlers(mainWindow);
  registerMapGenieHandlers();

  mainWindow.on("close", (event) => {
    if (!(app as any).isQuitting) {
      const settings = (userData as any).data?.settings;
      if (settings?.closeToTray) {
        event.preventDefault();
        mainWindow?.hide();
        return;
      }
    }
    app.quit();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
