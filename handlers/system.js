'use strict';

var __importDefault = this && this.__importDefault || function (_0x69eb2e) {
  if (_0x69eb2e && _0x69eb2e.__esModule) {
    return _0x69eb2e;
  } else {
    return {
      default: _0x69eb2e
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerSystemHandlers = registerSystemHandlers;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_log_1 = __importDefault(require("electron-log"));
let cachedToken = null;
async function getAccessToken() {
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    return cachedToken.access_token;
  }
  const _0x3b0640 = "l88wyfp5bwc32d2hyd6p54my4apyb5";
  const _0x4621fe = "5jurc5qhkwmfxzg932hj51ytqc9fh3";
  if (!_0x3b0640 || !_0x4621fe) {
    throw new Error("IGDB credentials missing in main process");
  }
  const _0x45809e = await fetch("https://id.twitch.tv/oauth2/token?client_id=" + _0x3b0640 + "&client_secret=" + _0x4621fe + "&grant_type=client_credentials", {
    method: "POST"
  });
  const _0x474952 = await _0x45809e.json();
  if (!_0x45809e.ok) {
    throw new Error("Failed to get IGDB token: " + JSON.stringify(_0x474952));
  }
  cachedToken = {
    access_token: _0x474952.access_token,
    expires_at: Date.now() + _0x474952.expires_in * 1000 - 60000
  };
  return cachedToken.access_token;
}
const CACHE_PATH = path_1.default.join(electron_1.app.getPath("userData"), "igdb_cache.json");
function getCache() {
  try {
    if (fs_1.default.existsSync(CACHE_PATH)) {
      return JSON.parse(fs_1.default.readFileSync(CACHE_PATH, "utf8"));
    }
  } catch (_0xb614b4) {
    console.error("Failed to read IGDB cache:", _0xb614b4);
  }
  return {};
}
function setCache(_0x7929b1) {
  try {
    fs_1.default.writeFileSync(CACHE_PATH, JSON.stringify(_0x7929b1, null, 2));
  } catch (_0x526bc3) {
    console.error("Failed to write IGDB cache:", _0x526bc3);
  }
}
function registerSystemHandlers(_0xd90574) {
  electron_1.ipcMain.handle("igdb-request", async (_0x365068, {
    endpoint: _0x49886f,
    body: _0xb8561d
  }) => {
    const _0x17f8b7 = _0x49886f + ":" + _0xb8561d;
    try {
      const _0x43723f = await getAccessToken();
      const _0x4ed1a9 = await fetch("https://api.igdb.com/v4/" + _0x49886f, {
        method: "POST",
        headers: {
          "Client-ID": "l88wyfp5bwc32d2hyd6p54my4apyb5",
          Authorization: "Bearer " + _0x43723f,
          "Content-Type": "text/plain"
        },
        body: _0xb8561d
      });
      const _0x5e3785 = await _0x4ed1a9.json();
      if (_0x4ed1a9.ok && _0x5e3785) {
        const _0x8fdb68 = getCache();
        _0x8fdb68[_0x17f8b7] = _0x5e3785;
        setCache(_0x8fdb68);
      }
      return _0x5e3785;
    } catch (_0x55312a) {
      console.error("IPC IGDB Error (Network failed, checking cache):", _0x55312a);
      const _0x247d6f = getCache();
      if (_0x247d6f[_0x17f8b7]) {
        console.log("[Cache] Returning cached data for " + _0x49886f);
        return _0x247d6f[_0x17f8b7];
      }
      throw _0x55312a;
    }
  });
  electron_1.ipcMain.on("log-to-main", (_0x228ac6, {
    level: _0x13bc26,
    args: _0x6cb70b
  }) => {
    if (electron_log_1.default[_0x13bc26]) {
      electron_log_1.default[_0x13bc26]("[Renderer]", ..._0x6cb70b);
    } else {
      electron_log_1.default.info("[Renderer]", ..._0x6cb70b);
    }
  });
  electron_1.ipcMain.handle("select-folder", async () => {
    const _0x564192 = await electron_1.dialog.showOpenDialog(_0xd90574, {
      properties: ["openDirectory"]
    });
    if (_0x564192.canceled) {
      return null;
    }
    return _0x564192.filePaths[0];
  });
  electron_1.ipcMain.handle("select-file", async (_0x2cb0b6, _0x41857b, _0x1f3613) => {
    const _0xa84a2f = await electron_1.dialog.showOpenDialog(_0xd90574, {
      title: _0x41857b || "Select File",
      filters: _0x1f3613 || [],
      properties: ["openFile"]
    });
    if (_0xa84a2f.canceled) {
      return null;
    }
    return _0xa84a2f.filePaths[0];
  });
  electron_1.ipcMain.on("is-packaged", _0x46518c => {
    _0x46518c.returnValue = electron_1.app.isPackaged;
  });
  electron_1.ipcMain.on("open-external", (_0x15c063, _0x455157) => {
    electron_1.shell.openExternal(_0x455157);
  });
  electron_1.ipcMain.handle("open-path", async (_0x23ec84, _0x30c307) => {
    if (!_0x30c307) {
      return {
        success: false,
        error: "No path provided"
      };
    }
    const _0x18a7cd = await electron_1.shell.openPath(_0x30c307);
    if (_0x18a7cd) {
      return {
        success: false,
        error: _0x18a7cd
      };
    }
    return {
      success: true
    };
  });
}