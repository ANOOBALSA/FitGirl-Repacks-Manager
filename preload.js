'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electron", {
  igdbRequest: (_0x34bb87, _0x26b31f) => electron_1.ipcRenderer.invoke("igdb-request", {
    endpoint: _0x34bb87,
    body: _0x26b31f
  }),
  getAuthCallback: () => electron_1.ipcRenderer.invoke("get-auth-callback"),
  getUserData: _0xc37553 => electron_1.ipcRenderer.invoke("user-data-get", _0xc37553),
  setUserData: (_0x40422e, _0x3737f1) => electron_1.ipcRenderer.invoke("user-data-set", {
    key: _0x40422e,
    value: _0x3737f1
  }),
  allUserData: _0xcb4971 => electron_1.ipcRenderer.invoke("user-data-all", _0xcb4971),
  syncUserDataDown: _0x1ca46f => electron_1.ipcRenderer.invoke("user-data-sync-down", _0x1ca46f),
  minimize: () => electron_1.ipcRenderer.send("window-minimize"),
  maximize: () => electron_1.ipcRenderer.send("window-maximize"),
  isMaximized: electron_1.ipcRenderer.sendSync("window-is-maximized"),
  hide: () => electron_1.ipcRenderer.send("window-hide"),
  close: () => electron_1.ipcRenderer.send("window-close"),
  toggleDevTools: () => electron_1.ipcRenderer.send("window-devtools"),
  openPath: _0x30da8c => electron_1.ipcRenderer.invoke("open-path", _0x30da8c),
  isDev: !electron_1.ipcRenderer.sendSync("is-packaged"),
  selectFolder: () => electron_1.ipcRenderer.invoke("select-folder"),
  selectFile: (_0x59445d, _0x48e75b) => electron_1.ipcRenderer.invoke("select-file", _0x59445d, _0x48e75b),
  scanGames: _0x5021a0 => electron_1.ipcRenderer.invoke("scan-games", _0x5021a0),
  mapgenieSearch: _0xd4b10d => electron_1.ipcRenderer.invoke("mapgenie-search", _0xd4b10d),
  getMapGeniePreload: () => electron_1.ipcRenderer.invoke("get-mapgenie-preload"),
  launchGame: _0x2ae853 => electron_1.ipcRenderer.invoke("launch-game", _0x2ae853),
  getActiveGame: () => electron_1.ipcRenderer.invoke("get-active-game"),
  startDownload: _0x35553f => electron_1.ipcRenderer.invoke("start-download", _0x35553f),
  pauseDownload: _0x397b10 => electron_1.ipcRenderer.invoke("pause-download", _0x397b10),
  resumeDownload: _0x4e5ed3 => electron_1.ipcRenderer.invoke("resume-download", _0x4e5ed3),
  deleteDownload: (_0x435d9c, _0x57712d) => electron_1.ipcRenderer.invoke("delete-download", {
    gameId: _0x435d9c,
    removeFiles: _0x57712d
  }),
  getActiveDownloads: () => electron_1.ipcRenderer.invoke("get-active-downloads"),
  toggleOptionalFile: _0x410b49 => electron_1.ipcRenderer.invoke("toggle-optional-file", _0x410b49),
  validateLinks: _0x56e7ed => electron_1.ipcRenderer.invoke("validate-links", _0x56e7ed),
  launchInstaller: (_0x212ad1, _0x3a13b1) => electron_1.ipcRenderer.invoke("launch-installer", _0x212ad1, _0x3a13b1),
  getSettings: () => electron_1.ipcRenderer.invoke("get-settings"),
  updateSettings: _0x35bbc7 => electron_1.ipcRenderer.invoke("update-settings", _0x35bbc7),
  listDownloadFiles: _0x2b9949 => electron_1.ipcRenderer.invoke("list-download-files", _0x2b9949),
  checkInstallerExists: _0x5ed63e => electron_1.ipcRenderer.invoke("check-installer-exists", _0x5ed63e),
  unpackDownloadRars: _0x2849e0 => electron_1.ipcRenderer.invoke("unpack-download-rars", _0x2849e0),
  deleteDownloadRars: _0x3c5978 => electron_1.ipcRenderer.invoke("delete-download-rars", _0x3c5978),
  deleteInstallFiles: _0x3058cc => electron_1.ipcRenderer.invoke("delete-install-files", _0x3058cc),
  uninstallGame: _0x508a95 => electron_1.ipcRenderer.invoke("uninstall-game", _0x508a95),
  onUserDataUpdated: _0x32a187 => {
    const _0x545a37 = () => _0x32a187();
    electron_1.ipcRenderer.on("user-data-updated", _0x545a37);
    return () => electron_1.ipcRenderer.removeListener("user-data-updated", _0x545a37);
  },
  onGameStatusUpdated: _0x3a67ba => {
    const _0x2c7e11 = (_0x2ba745, _0x254f5a) => _0x3a67ba(_0x254f5a);
    electron_1.ipcRenderer.on("game-status-updated", _0x2c7e11);
    return () => electron_1.ipcRenderer.removeListener("game-status-updated", _0x2c7e11);
  },
  onDownloadProgress: _0x19b0d9 => {
    const _0x472eb1 = (_0xc4d58, _0x19008b) => _0x19b0d9(_0x19008b);
    electron_1.ipcRenderer.on("download-progress", _0x472eb1);
    return () => electron_1.ipcRenderer.removeListener("download-progress", _0x472eb1);
  },
  onAuthCallback: _0x21dded => {
    const _0x5dfa38 = (_0x3ab5a9, _0x29dd66) => _0x21dded(_0x29dd66);
    electron_1.ipcRenderer.on("auth-callback", _0x5dfa38);
    return () => electron_1.ipcRenderer.removeListener("auth-callback", _0x5dfa38);
  },
  log: (_0xa74e43, ..._0x2c469f) => electron_1.ipcRenderer.send("log-to-main", {
    level: _0xa74e43,
    args: _0x2c469f
  }),
  openExternal: _0x58eb04 => electron_1.ipcRenderer.send("open-external", _0x58eb04),
  onWindowStateChanged: _0x11c4e3 => {
    const _0x7fc31e = (_0x1f252a, _0x24b522) => _0x11c4e3(_0x24b522);
    electron_1.ipcRenderer.on("window-state-changed", _0x7fc31e);
    return () => electron_1.ipcRenderer.removeListener("window-state-changed", _0x7fc31e);
  },
  onNewRepackNotification: _0x15f732 => {
    const _0x486331 = (_0x263a22, _0x3a1f39) => _0x15f732(_0x3a1f39);
    electron_1.ipcRenderer.on("new-repack-notification", _0x486331);
    return () => electron_1.ipcRenderer.removeListener("new-repack-notification", _0x486331);
  },
  onNavigateToRepack: _0xf88acd => {
    const _0x4e71df = (_0x2d226f, _0x29c8fd) => _0xf88acd(_0x29c8fd);
    electron_1.ipcRenderer.on("navigate-to-repack", _0x4e71df);
    return () => electron_1.ipcRenderer.removeListener("navigate-to-repack", _0x4e71df);
  },
  showMainWindow: () => electron_1.ipcRenderer.send("window-show-main"),
  notifyAuthSignin: () => electron_1.ipcRenderer.invoke("notify-auth-signin"),
  notifyAuthSignout: () => electron_1.ipcRenderer.invoke("notify-auth-signout")
});
window.addEventListener("DOMContentLoaded", () => {
  const _0x65ca37 = (_0x5669b8, _0x3b3cc4) => {
    const _0x282a5f = document.getElementById(_0x5669b8);
    if (_0x282a5f) {
      _0x282a5f.innerText = _0x3b3cc4;
    }
  };
  const _0x42dab9 = process.versions;
  for (const _0x4b62d2 of ["chrome", "node", "electron"]) {
    _0x65ca37(_0x4b62d2 + "-version", _0x42dab9[_0x4b62d2]);
  }
});