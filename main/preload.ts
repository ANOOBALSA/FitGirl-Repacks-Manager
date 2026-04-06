import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  igdbRequest: (endpoint: string, body: string) =>
    ipcRenderer.invoke("igdb-request", { endpoint, body }),

  getAuthCallback: () => ipcRenderer.invoke("get-auth-callback"),

  getUserData: (key?: string) => ipcRenderer.invoke("user-data-get", key),
  setUserData: (key: string, value: any) =>
    ipcRenderer.invoke("user-data-set", { key, value }),
  allUserData: (data?: any) => ipcRenderer.invoke("user-data-all", data),
  syncUserDataDown: (data: any) =>
    ipcRenderer.invoke("user-data-sync-down", data),
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  isMaximized: ipcRenderer.sendSync("window-is-maximized"),
  hide: () => ipcRenderer.send("window-hide"),
  close: () => ipcRenderer.send("window-close"),
  toggleDevTools: () => ipcRenderer.send("window-devtools"),
  openPath: (path: string) => ipcRenderer.invoke("open-path", path),
  isDev: !ipcRenderer.sendSync("is-packaged"),

  // Game detection and launching
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  selectFile: (title: string, filters: any[]) =>
    ipcRenderer.invoke("select-file", title, filters),
  scanGames: (folderPath: string) =>
    ipcRenderer.invoke("scan-games", folderPath),
  mapgenieSearch: (gameTitle: string) =>
    ipcRenderer.invoke("mapgenie-search", gameTitle),
  getMapGeniePreload: () => ipcRenderer.invoke("get-mapgenie-preload"),
  launchGame: (exePath: string) => ipcRenderer.invoke("launch-game", exePath),
  getActiveGame: () => ipcRenderer.invoke("get-active-game"),

  // Download and Installer
  startDownload: (payload: any) =>
    ipcRenderer.invoke("start-download", payload),
  pauseDownload: (gameId: string) =>
    ipcRenderer.invoke("pause-download", gameId),
  resumeDownload: (gameId: string) =>
    ipcRenderer.invoke("resume-download", gameId),
  deleteDownload: (gameId: string, removeFiles: boolean) =>
    ipcRenderer.invoke("delete-download", { gameId, removeFiles }),
  getActiveDownloads: () => ipcRenderer.invoke("get-active-downloads"),
  toggleOptionalFile: (payload: any) =>
    ipcRenderer.invoke("toggle-optional-file", payload),
  validateLinks: (links: string[]) =>
    ipcRenderer.invoke("validate-links", links),
  launchInstaller: (folderPath: string, options: any) =>
    ipcRenderer.invoke("launch-installer", folderPath, options),

  getSettings: () => ipcRenderer.invoke("get-settings"),
  updateSettings: (settings: any) =>
    ipcRenderer.invoke("update-settings", settings),

  // File management for downloaded games
  listDownloadFiles: (folderPath: string) =>
    ipcRenderer.invoke("list-download-files", folderPath),
  checkInstallerExists: (folderPath: string) =>
    ipcRenderer.invoke("check-installer-exists", folderPath),
  unpackDownloadRars: (gameId: string) =>
    ipcRenderer.invoke("unpack-download-rars", gameId),
  deleteDownloadRars: (folderPath: string) =>
    ipcRenderer.invoke("delete-download-rars", folderPath),
  deleteInstallFiles: (payload: any) =>
    ipcRenderer.invoke("delete-install-files", payload),
  uninstallGame: (exePath: string) =>
    ipcRenderer.invoke("uninstall-game", exePath),

  onUserDataUpdated: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on("user-data-updated", subscription);
    return () => ipcRenderer.removeListener("user-data-updated", subscription);
  },
  onGameStatusUpdated: (callback: (status: any) => void) => {
    const subscription = (_event: any, status: any) => callback(status);
    ipcRenderer.on("game-status-updated", subscription);
    return () =>
      ipcRenderer.removeListener("game-status-updated", subscription);
  },
  onDownloadProgress: (callback: (progress: any) => void) => {
    const subscription = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on("download-progress", subscription);
    return () => ipcRenderer.removeListener("download-progress", subscription);
  },

  onAuthCallback: (callback: (url: string) => void) => {
    const subscription = (_event: any, url: string) => callback(url);
    ipcRenderer.on("auth-callback", subscription);
    return () => ipcRenderer.removeListener("auth-callback", subscription);
  },

  log: (level: string, ...args: any[]) =>
    ipcRenderer.send("log-to-main", { level, args }),
  openExternal: (url: string) => ipcRenderer.send("open-external", url),
  onWindowStateChanged: (
    callback: (state: { isMaximized: boolean }) => void,
  ) => {
    const subscription = (_event: any, state: { isMaximized: boolean }) =>
      callback(state);
    ipcRenderer.on("window-state-changed", subscription);
    return () =>
      ipcRenderer.removeListener("window-state-changed", subscription);
  },

  onNewRepackNotification: (callback: (repack: any) => void) => {
    const subscription = (_event: any, repack: any) => callback(repack);
    ipcRenderer.on("new-repack-notification", subscription);
    return () =>
      ipcRenderer.removeListener("new-repack-notification", subscription);
  },

  onNavigateToRepack: (callback: (repack: any) => void) => {
    const subscription = (_event: any, repack: any) => callback(repack);
    ipcRenderer.on("navigate-to-repack", subscription);
    return () => ipcRenderer.removeListener("navigate-to-repack", subscription);
  },
  showMainWindow: () => ipcRenderer.send("window-show-main"),

  // Auth/Notification coordination
  notifyAuthSignin: () => ipcRenderer.invoke("notify-auth-signin"),
  notifyAuthSignout: () => ipcRenderer.invoke("notify-auth-signout"),
});

// Basic preload script functionality
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  const versions = process.versions as any;
  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, versions[type]);
  }
});
