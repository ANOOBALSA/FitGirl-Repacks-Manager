'use strict';

var __importDefault = this && this.__importDefault || function (_0xa7173e) {
  if (_0xa7173e && _0xa7173e.__esModule) {
    return _0xa7173e;
  } else {
    return {
      default: _0xa7173e
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadURL = undefined;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_log_1 = __importDefault(require("electron-log"));
const electron_serve_1 = __importDefault(require("electron-serve"));
const APP_ID = "com.fitgirl-repacks-manager.app";
const APP_NAME = "FitGirl Repacks Manager";
electron_1.app.setName(APP_NAME);
electron_1.app.name = APP_NAME;
if (process.platform === "win32") {
  electron_1.app.setAppUserModelId(APP_ID);
}
console.log("[Main] App Identity: " + electron_1.app.getName() + " (" + APP_ID + ")");
const serveHandler = typeof electron_serve_1.default === "function" ? electron_serve_1.default : electron_serve_1.default.default;
exports.loadURL = serveHandler({
  directory: electron_1.app.isPackaged ? path_1.default.join(electron_1.app.getAppPath(), "out") : path_1.default.join(electron_1.app.getAppPath(), "build", "out"),
  partition: "persist:launcher"
});
let lastAuthUrl = null;
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.error("====================================================");
  console.error("[Main] Another instance is already running. Exiting.");
  console.error("====================================================");
  electron_1.app.quit();
} else {
  if (electron_1.app.isPackaged) {
    electron_1.app.setAsDefaultProtocolClient("fitgirl-repacks");
  } else if (process.defaultApp) {
    if (process.argv.length >= 2) {
      electron_1.app.setAsDefaultProtocolClient("fitgirl-repacks", process.execPath, [path_1.default.resolve(process.argv[1])]);
    }
  }
  electron_1.app.on("second-instance", (_0x102ef7, _0x5a36f6, _0x4ed2fd) => {
    const _0x4e75ec = (0, windowService_1.getMainWindow)();
    if (_0x4e75ec) {
      if (_0x4e75ec.isMinimized()) {
        _0x4e75ec.restore();
      }
      if (!_0x4e75ec.isVisible()) {
        _0x4e75ec.show();
      }
      _0x4e75ec.focus();
      const _0x19acc9 = _0x5a36f6.find(_0x5bd477 => _0x5bd477.startsWith("fitgirl-repacks://"));
      if (_0x19acc9) {
        handleDeepLink(_0x19acc9);
      }
    }
  });
  if (!electron_1.app.isPackaged) {
    console.warn("====================================================");
    console.warn("[Main] DEV MODE: Single instance lock ACTIVE.");
    console.warn("[Main] This ensures deep links focus the existing instance.");
    console.warn("====================================================");
  } else {
    console.log("[Main] Starting single instance.");
  }
}
electron_1.app.on("open-url", (_0x32beaa, _0x19cebc) => {
  _0x32beaa.preventDefault();
  handleDeepLink(_0x19cebc);
});
function handleDeepLink(_0x5c30be) {
  console.log("[Main] Handling deep link:", _0x5c30be);
  lastAuthUrl = _0x5c30be;
  const _0x1a861e = (0, windowService_1.getMainWindow)();
  if (_0x1a861e) {
    _0x1a861e.webContents.send("auth-callback", _0x5c30be);
  }
}
electron_1.ipcMain.handle("get-auth-callback", () => {
  const _0x2f2372 = lastAuthUrl;
  lastAuthUrl = null;
  return _0x2f2372;
});
const windowService_1 = require("./services/windowService");
const auth_1 = require("./handlers/auth");
electron_log_1.default.transports.file.level = "info";
electron_log_1.default.transports.console.level = "info";
Object.assign(console, electron_log_1.default.functions);
console.log("[Main] Logging initialized");
process.on("uncaughtException", _0x2f9e55 => {
  console.error("[Main] Uncaught Exception:", _0x2f9e55);
});
process.on("unhandledRejection", (_0xea6bb2, _0x306871) => {
  console.error("[Main] Unhandled Rejection at:", _0x306871, "reason:", _0xea6bb2);
});
function loadEnv() {
  const _0x2fe1e3 = [path_1.default.join(electron_1.app.getAppPath(), ".env"), path_1.default.join(electron_1.app.getAppPath(), ".env.local"), path_1.default.join(electron_1.app.getPath("userData"), ".env"), path_1.default.join(electron_1.app.getPath("userData"), ".env.local"), path_1.default.join(path_1.default.dirname(electron_1.app.getPath("exe")), ".env"), path_1.default.join(path_1.default.dirname(electron_1.app.getPath("exe")), ".env.local")];
  for (const _0x37e99c of _0x2fe1e3) {
    try {
      if (fs_1.default.existsSync(_0x37e99c)) {
        console.log("[Main] Loading env from: " + _0x37e99c);
        const _0x1fe4d5 = fs_1.default.readFileSync(_0x37e99c, "utf8");
        _0x1fe4d5.split(/\r?\n/).forEach(_0x574b30 => {
          const _0x303820 = _0x574b30.trim();
          if (!_0x303820 || _0x303820.startsWith("#")) {
            return;
          }
          const _0x2322d7 = _0x303820.indexOf("=");
          if (_0x2322d7 > 0) {
            const _0x400251 = _0x303820.substring(0, _0x2322d7).trim();
            const _0x1ebac4 = _0x303820.substring(_0x2322d7 + 1).trim();
            if (_0x400251 && _0x1ebac4) {
              process.env[_0x400251] = _0x1ebac4;
            }
          }
        });
      }
    } catch (_0x5188a8) {
      console.error("[Main] Error loading env from " + _0x37e99c + ":", _0x5188a8);
    }
  }
}
if (!electron_1.app.isPackaged) {
  loadEnv();
}
electron_1.app.on("ready", () => {
  (0, windowService_1.createWindow)();
  (0, auth_1.registerAuthHandlers)();
  if (!electron_1.app.isPackaged || process.argv.length > 1) {
    const _0x398878 = process.argv.find(_0x35e8b5 => _0x35e8b5.startsWith("fitgirl-repacks://"));
    if (_0x398878) {
      handleDeepLink(_0x398878);
    }
  }
});
electron_1.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron_1.app.quit();
  }
});
electron_1.app.on("activate", () => {
  if ((0, windowService_1.getMainWindow)() === null) {
    (0, windowService_1.createWindow)();
  }
});