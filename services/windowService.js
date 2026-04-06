'use strict';

var __importDefault = this && this.__importDefault || function (_0x2df6bb) {
  if (_0x2df6bb && _0x2df6bb.__esModule) {
    return _0x2df6bb;
  } else {
    return {
      default: _0x2df6bb
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createWindow = createWindow;
exports.getMainWindow = getMainWindow;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const index_1 = require("../index");
const downloadManagerService_1 = __importDefault(require("./downloadManagerService"));
const utils_1 = require("../utils");
const userDataService_1 = __importDefault(require("./userDataService"));
const userData_1 = require("../handlers/userData");
const games_1 = require("../handlers/games");
const downloads_1 = require("../handlers/downloads");
const system_1 = require("../handlers/system");
const window_1 = require("../handlers/window");
const mapgenie_1 = require("../handlers/mapgenie");
const trayService_1 = __importDefault(require("./trayService"));
const jumpListService_1 = require("./jumpListService");
let mainWindow = null;
let loadingWindow = null;
let downloadManager = null;
let resolveReadySignal;
const readySignalPromise = new Promise(_0xf498e4 => {
  resolveReadySignal = _0xf498e4;
});
electron_1.ipcMain.on("window-show-main", () => {
  console.log("[Main] Received signal from renderer to show window.");
  if (resolveReadySignal) {
    resolveReadySignal();
  }
});
function createLoadingWindow() {
  loadingWindow = new electron_1.BrowserWindow({
    width: 400,
    height: 450,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: (0, utils_1.getAssetPath)("app_icon.png")
  });
  loadingWindow.loadFile((0, utils_1.getAssetPath)("loading.html"));
  loadingWindow.on("closed", () => loadingWindow = null);
}
function createWindow() {
  console.log("[Main] Creating window...");
  createLoadingWindow();
  mainWindow = new electron_1.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    frame: false,
    show: false,
    icon: (0, utils_1.getAssetPath)("app_icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path_1.default.join(__dirname, "..", "preload.js"),
      webviewTag: true,
      devTools: utils_1.isDev,
      partition: "persist:launcher"
    }
  });
  if (!utils_1.isDev) {
    electron_1.session.fromPartition("persist:launcher").webRequest.onBeforeSendHeaders({
      urls: ["https://www.youtube.com/embed/*"]
    }, (_0x5c4cef, _0x54bdec) => {
      _0x5c4cef.requestHeaders.Referer = "https://www.youtube.com/";
      _0x54bdec({
        requestHeaders: _0x5c4cef.requestHeaders
      });
    });
  }
  if (utils_1.isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    (0, index_1.loadURL)(mainWindow);
  }
  const _0x4ea09d = Date.now();
  const _0x1475d9 = 15000;
  const _0x532757 = Promise.resolve();
  const _0x323fc1 = new Promise(_0x159d6a => setTimeout(() => {
    console.warn("[Main] Failsafe timeout reached. Showing window.");
    _0x159d6a(true);
  }, _0x1475d9));
  const _0x4b5f6d = new Promise(_0x338ad6 => {
    mainWindow.webContents.once("did-finish-load", () => {
      _0x338ad6(true);
    });
  });
  Promise.all([_0x4b5f6d, Promise.race([readySignalPromise, _0x323fc1])]).then(async () => {
    if (loadingWindow) {
      loadingWindow.close();
      loadingWindow = null;
    }
    if (mainWindow) {
      const _0x1e1533 = (await userDataService_1.default.getData()).settings;
      if (_0x1e1533.startMinimized) {
        console.log("[Main] Starting minimized to tray");
        mainWindow.hide();
      } else {
        mainWindow.maximize();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
  if (!trayService_1.default.getTray()) {
    trayService_1.default.createTray(mainWindow, () => (0, jumpListService_1.updateJumpList)(mainWindow));
  }
  (0, jumpListService_1.updateJumpList)(mainWindow);
  downloadManager = new downloadManagerService_1.default(mainWindow);
  (0, userData_1.registerUserDataHandlers)(mainWindow, () => (0, jumpListService_1.updateJumpList)(mainWindow));
  (0, games_1.registerGameHandlers)(mainWindow, downloadManager, () => (0, jumpListService_1.updateJumpList)(mainWindow));
  (0, downloads_1.registerDownloadHandlers)(mainWindow, downloadManager);
  (0, system_1.registerSystemHandlers)(mainWindow);
  (0, window_1.registerWindowHandlers)(mainWindow);
  (0, mapgenie_1.registerMapGenieHandlers)();
  mainWindow.on("close", _0xb3610 => {
    if (!electron_1.app.isQuitting) {
      const _0xfe13a9 = userDataService_1.default.data?.settings;
      if (_0xfe13a9?.closeToTray) {
        _0xb3610.preventDefault();
        mainWindow?.hide();
        return;
      }
    }
    electron_1.app.quit();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}
function getMainWindow() {
  return mainWindow;
}