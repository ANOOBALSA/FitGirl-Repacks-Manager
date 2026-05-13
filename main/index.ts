import { app, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import log from "electron-log";
import serve from "electron-serve";
import { createWindow, getMainWindow } from "./services/windowService";
import { notificationService } from "./services/notificationService";
import { registerAuthHandlers } from "./handlers/auth";
import userData from "./services/userDataService";

const APP_ID = "com.fitgirl-repacks-manager.app";
const APP_NAME = "FitGirl Repacks Manager";

app.setName(APP_NAME);
app.name = APP_NAME;
if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

console.log(`[Main] App Identity: ${app.getName()} (${APP_ID})`);

// @ts-ignore
const serveHandler = typeof serve === "function" ? serve : serve.default;

export const loadURL = serveHandler({
  directory: app.isPackaged
    ? path.join(app.getAppPath(), "out")
    : path.join(app.getAppPath(), "build", "out"),
  partition: "persist:launcher",
});

let lastAuthUrl: string | null = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.error("====================================================");
  console.error("[Main] Another instance is already running. Exiting.");
  console.error("====================================================");
  app.quit();
} else {
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient("fitgirl-repacks");
  } else if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("fitgirl-repacks", process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  }

  app.on("second-instance", (event, commandLine, workingDirectory) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();

      const url = commandLine.find((arg) =>
        arg.startsWith("fitgirl-repacks://"),
      );
      if (url) {
        handleDeepLink(url);
      }
    }
  });

  if (!app.isPackaged) {
    console.warn("====================================================");
    console.warn("[Main] DEV MODE: Single instance lock ACTIVE.");
    console.warn("[Main] This ensures deep links focus the existing instance.");
    console.warn("====================================================");
  } else {
    console.log("[Main] Starting single instance.");
  }
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function handleDeepLink(url: string) {
  console.log("[Main] Handling deep link:", url);
  lastAuthUrl = url;
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send("auth-callback", url);
  }
}

ipcMain.handle("get-auth-callback", () => {
  const url = lastAuthUrl;
  lastAuthUrl = null;
  return url;
});
(log.transports.file as any).level = "info";
(log.transports.console as any).level = "info";
Object.assign(console, log.functions);

console.log("[Main] Logging initialized");

process.on("uncaughtException", (error) => {
  console.error("[Main] Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Main] Unhandled Rejection at:", promise, "reason:", reason);
});

app.on("ready", () => {
  createWindow();
  registerAuthHandlers();
  userData.ensureDataLoaded();

  if (!app.isPackaged || process.argv.length > 1) {
    const url = process.argv.find((arg) =>
      arg.startsWith("fitgirl-repacks://"),
    );
    if (url) {
      handleDeepLink(url);
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (getMainWindow() === null) createWindow();
});
