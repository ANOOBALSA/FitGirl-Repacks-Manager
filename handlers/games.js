'use strict';

var __createBinding = this && this.__createBinding || (Object.create ? function (_0x2a2727, _0x116f68, _0x5cf028, _0x132e56 = _0x5cf028) {
  var _0x1159f5 = Object.getOwnPropertyDescriptor(_0x116f68, _0x5cf028);
  if (!_0x1159f5 || ("get" in _0x1159f5 ? !_0x116f68.__esModule : _0x1159f5.writable || _0x1159f5.configurable)) {
    _0x1159f5 = {
      enumerable: true,
      get: function () {
        return _0x116f68[_0x5cf028];
      }
    };
  }
  Object.defineProperty(_0x2a2727, _0x132e56, _0x1159f5);
} : function (_0x218123, _0x549be4, _0x16b7f9, _0x45ed8f = _0x16b7f9) {
  _0x218123[_0x45ed8f] = _0x549be4[_0x16b7f9];
});
var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (_0x5baf8e, _0x243abc) {
  Object.defineProperty(_0x5baf8e, "default", {
    enumerable: true,
    value: _0x243abc
  });
} : function (_0x4f67f8, _0x10250e) {
  _0x4f67f8.default = _0x10250e;
});
var __importStar = this && this.__importStar || function () {
  function _0x22d442(_0x314976) {
    _0x22d442 = Object.getOwnPropertyNames || function (_0x15c34b) {
      var _0x483e6a = [];
      for (var _0x309994 in _0x15c34b) {
        if (Object.prototype.hasOwnProperty.call(_0x15c34b, _0x309994)) {
          _0x483e6a[_0x483e6a.length] = _0x309994;
        }
      }
      return _0x483e6a;
    };
    return _0x22d442(_0x314976);
  }
  return function (_0x270599) {
    if (_0x270599 && _0x270599.__esModule) {
      return _0x270599;
    }
    var _0x40d866 = {};
    if (_0x270599 != null) {
      for (var _0x3118da = _0x22d442(_0x270599), _0x399a44 = 0; _0x399a44 < _0x3118da.length; _0x399a44++) {
        if (_0x3118da[_0x399a44] !== "default") {
          __createBinding(_0x40d866, _0x270599, _0x3118da[_0x399a44]);
        }
      }
    }
    __setModuleDefault(_0x40d866, _0x270599);
    return _0x40d866;
  };
}();
var __importDefault = this && this.__importDefault || function (_0x4e5187) {
  if (_0x4e5187 && _0x4e5187.__esModule) {
    return _0x4e5187;
  } else {
    return {
      default: _0x4e5187
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerGameHandlers = registerGameHandlers;
exports.launchGameAction = launchGameAction;
const electron_1 = require("electron");
const gameDetector = __importStar(require("../services/gameDetectorService"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_extra_1 = __importDefault(require("fs-extra"));
const userDataService_1 = __importDefault(require("../services/userDataService"));
let activeGameId = null;
let playTimeInterval = null;
let currentSessionMinutes = 0;
function registerGameHandlers(_0x42b686, _0x210d4b, _0x4f7fc6) {
  electron_1.ipcMain.handle("scan-games", async (_0x37e9ea, _0x55e109) => {
    const _0x16a19b = await userDataService_1.default.getData();
    const _0x2cced6 = _0x322cf2 => _0x322cf2.replace(/\\/g, "/").toLowerCase();
    const _0x49ed29 = new Set(Object.values(_0x16a19b.gamePaths || {}).map(_0x2d276a => _0x2cced6(String(_0x2d276a))));
    console.log("[Scan] Scanning " + _0x55e109);
    console.log("[Scan] Existing paths count: " + _0x49ed29.size);
    if (_0x49ed29.size > 0) {
      console.log("[Scan] Sample existing paths: " + Array.from(_0x49ed29).slice(0, 3).join(", "));
    }
    const _0x1c49dc = await gameDetector.scanForGames(_0x55e109);
    const _0x232a72 = _0x1c49dc.filter(_0x176ba2 => {
      const _0x4845db = _0x176ba2.executables.some(_0x578bb9 => {
        const _0x283b67 = _0x2cced6(_0x578bb9.path);
        return _0x49ed29.has(_0x283b67);
      });
      if (_0x4845db) {
        console.log("[Scan] Hiding already-added game (any EXE match): " + _0x176ba2.detectedName);
      }
      return !_0x4845db;
    });
    console.log("[Scan] Returning " + _0x232a72.length + " games (from " + _0x1c49dc.length + " detected)");
    return _0x232a72;
  });
  electron_1.ipcMain.handle("launch-game", async (_0x5a8e50, _0x44c76c) => {
    return await launchGameAction(_0x42b686, _0x44c76c, _0x4f7fc6);
  });
  electron_1.ipcMain.handle("get-active-game", () => activeGameId);
  electron_1.ipcMain.handle("uninstall-game", async (_0x4abc5b, _0x372ec0) => {
    try {
      const _0x1b2d77 = path_1.default.dirname(_0x372ec0);
      const _0x13b812 = await fs_extra_1.default.readdir(_0x1b2d77);
      const _0x18bcbc = _0x13b812.find(_0x59395f => _0x59395f.toLowerCase().startsWith("unins") && _0x59395f.toLowerCase().endsWith(".exe"));
      if (!_0x18bcbc) {
        return {
          success: false,
          error: "Uninstaller not found"
        };
      }
      const _0x376088 = path_1.default.join(_0x1b2d77, _0x18bcbc);
      await new Promise((_0x381e3d, _0x45ccc6) => {
        const _0x2bf58d = (0, child_process_1.spawn)("start /wait \"\" \"" + _0x376088 + "\"", [], {
          cwd: _0x1b2d77,
          stdio: "ignore",
          shell: true
        });
        _0x2bf58d.on("error", _0x45ccc6);
        _0x2bf58d.on("close", () => {
          if (_0x42b686) {
            _0x42b686.webContents.send("user-data-updated");
          }
          _0x381e3d();
        });
      });
      return {
        success: true
      };
    } catch (_0x13f0ac) {
      return {
        success: false,
        error: _0x13f0ac.message
      };
    }
  });
  electron_1.ipcMain.handle("list-download-files", async (_0x288476, _0x1dad8a) => {
    try {
      const _0x26f722 = await fs_extra_1.default.readdir(_0x1dad8a, {
        withFileTypes: true
      });
      const _0x58f527 = await Promise.all(_0x26f722.map(async _0x471088 => {
        const _0xb30a8e = path_1.default.join(_0x1dad8a, _0x471088.name);
        const _0x42eb9e = await fs_extra_1.default.stat(_0xb30a8e).catch(() => null);
        return {
          name: _0x471088.name,
          isDir: _0x471088.isDirectory(),
          size: _0x42eb9e?.size || 0
        };
      }));
      return {
        success: true,
        files: _0x58f527
      };
    } catch (_0xaadde) {
      return {
        success: false,
        error: _0xaadde.message,
        files: []
      };
    }
  });
  electron_1.ipcMain.handle("check-installer-exists", async (_0x3babc6, _0x34a6c7) => {
    try {
      const _0x2aa4ae = await fs_extra_1.default.readdir(_0x34a6c7);
      const _0x1d1c9c = _0x2aa4ae.some(_0x36f0b0 => _0x36f0b0.toLowerCase().startsWith("setup") && _0x36f0b0.toLowerCase().endsWith(".exe"));
      return {
        exists: _0x1d1c9c
      };
    } catch {
      return {
        exists: false
      };
    }
  });
  electron_1.ipcMain.handle("unpack-download-rars", async (_0x126ee4, _0x121409) => {
    try {
      if (_0x210d4b) {
        await _0x210d4b.unpackRarFiles(_0x121409);
        return {
          success: true
        };
      }
      return {
        success: false,
        error: "Download manager not available"
      };
    } catch (_0x2b08ba) {
      return {
        success: false,
        error: _0x2b08ba.message
      };
    }
  });
  electron_1.ipcMain.handle("delete-download-rars", async (_0x4be450, _0x28b352) => {
    try {
      const _0x3eb73c = await fs_extra_1.default.readdir(_0x28b352);
      const _0x425076 = _0x3eb73c.filter(_0x5d66b7 => _0x5d66b7.toLowerCase().endsWith(".rar"));
      for (const _0x52b869 of _0x425076) {
        await fs_extra_1.default.remove(path_1.default.join(_0x28b352, _0x52b869));
      }
      return {
        success: true,
        deleted: _0x425076.length
      };
    } catch (_0x21315a) {
      return {
        success: false,
        error: _0x21315a.message
      };
    }
  });
  electron_1.ipcMain.handle("delete-install-files", async (_0x172160, {
    gameId: _0x43e260,
    folderPath: _0x2263f5
  }) => {
    try {
      await fs_extra_1.default.remove(_0x2263f5);
      const _0x1801c8 = await userDataService_1.default.getData();
      let _0x14677f = false;
      if (_0x1801c8.downloadedGames && _0x1801c8.downloadedGames[_0x43e260]) {
        delete _0x1801c8.downloadedGames[_0x43e260];
        _0x14677f = true;
      }
      if (_0x1801c8.activeDownloads && _0x1801c8.activeDownloads[_0x43e260]) {
        delete _0x1801c8.activeDownloads[_0x43e260];
        _0x14677f = true;
        _0x42b686?.webContents.send("download-progress", {
          gameId: _0x43e260,
          status: "deleted"
        });
      }
      if (_0x14677f) {
        await userDataService_1.default.saveData();
        _0x42b686?.webContents.send("user-data-updated");
      }
      return {
        success: true
      };
    } catch (_0x59b82f) {
      return {
        success: false,
        error: _0x59b82f.message
      };
    }
  });
}
async function launchGameAction(_0x18b2ec, _0x26b523, _0x3df33c) {
  if (activeGameId !== null) {
    console.log("[Launch] Blocked: A game is already running.");
    return false;
  }
  const _0x191a6e = path_1.default.dirname(_0x26b523);
  const _0x437732 = async () => {
    return new Promise(_0x70dd37 => {
      (0, child_process_1.exec)("tasklist /FI \"IMAGENAME eq DS4Windows.exe\"", (_0x425461, _0x4d5af8) => {
        _0x70dd37(_0x4d5af8.includes("DS4Windows.exe"));
      });
    });
  };
  let _0x93a9c2 = false;
  let _0xe1ae2b = null;
  try {
    const _0x15378c = await userDataService_1.default.getData();
    _0xe1ae2b = Object.keys(_0x15378c.gamePaths).find(_0x142b5e => _0x15378c.gamePaths[_0x142b5e] === _0x26b523) || null;
    if (_0xe1ae2b && _0x15378c.gameDs4Settings[_0xe1ae2b] && _0x15378c.settings.ds4WindowsPath) {
      const _0x18fbc7 = await _0x437732();
      if (!_0x18fbc7) {
        console.log("[Launch] Starting DS4Windows: " + _0x15378c.settings.ds4WindowsPath);
        const _0x22a7b7 = (0, child_process_1.spawn)("\"" + _0x15378c.settings.ds4WindowsPath + "\"", [], {
          detached: true,
          stdio: "ignore",
          shell: true
        });
        _0x22a7b7.on("error", _0x31b529 => console.error("[Launch] DS4Windows spawn error:", _0x31b529));
        _0x22a7b7.unref();
        _0x93a9c2 = true;
        await new Promise(_0x119a3c => setTimeout(_0x119a3c, 2000));
      }
    }
  } catch (_0x30ba60) {
    console.error("[Launch] Failed to handle DS4 settings", _0x30ba60);
  }
  console.log("[Launch] Starting game: " + _0x26b523);
  activeGameId = _0xe1ae2b || "unknown";
  _0x18b2ec?.webContents.send("game-status-updated", {
    running: true,
    gameId: activeGameId
  });
  const _0x474fbd = Date.now();
  const _0x4b377d = (0, child_process_1.spawn)("\"" + _0x26b523 + "\"", [], {
    cwd: _0x191a6e,
    detached: true,
    stdio: "ignore",
    shell: true
  });
  currentSessionMinutes = 0;
  if (playTimeInterval) {
    clearInterval(playTimeInterval);
  }
  playTimeInterval = setInterval(async () => {
    currentSessionMinutes++;
    if (currentSessionMinutes % 5 === 0) {
      try {
        const _0x57b423 = await userDataService_1.default.getData();
        if (_0xe1ae2b) {
          if (!_0x57b423.playTime) {
            _0x57b423.playTime = {};
          }
          _0x57b423.playTime[_0xe1ae2b] = (_0x57b423.playTime[_0xe1ae2b] || 0) + 5;
          await userDataService_1.default.saveData();
          _0x18b2ec?.webContents.send("user-data-updated");
        }
      } catch (_0x4e2f8d) {
        console.error("[PlayTime] Periodic save failed:", _0x4e2f8d);
      }
    }
  }, 60000);
  _0x4b377d.on("error", _0x26cd73 => {
    console.error("[Launch] Game spawn error:", _0x26cd73);
    activeGameId = null;
    if (playTimeInterval) {
      clearInterval(playTimeInterval);
      playTimeInterval = null;
    }
    _0x18b2ec?.webContents.send("game-status-updated", {
      running: false
    });
  });
  _0x4b377d.on("exit", async () => {
    console.log("[Launch] game exited");
    activeGameId = null;
    if (playTimeInterval) {
      clearInterval(playTimeInterval);
      playTimeInterval = null;
    }
    _0x18b2ec?.webContents.send("game-status-updated", {
      running: false
    });
    if (_0x93a9c2) {
      console.log("[Launch] Closing DS4Windows as requested...");
      (0, child_process_1.exec)("taskkill /F /IM DS4Windows.exe", _0x161738 => {
        if (_0x161738) {
          console.error("[Launch] Failed to close DS4Windows:", _0x161738);
        } else {
          console.log("[Launch] DS4Windows closed successfully.");
        }
      });
    }
    const _0x363cc7 = currentSessionMinutes % 5;
    console.log("Session total mins: " + currentSessionMinutes + ", saving remaining: " + _0x363cc7);
    if (currentSessionMinutes > 0) {
      try {
        const _0x4bf1a8 = await userDataService_1.default.getData();
        const _0x54ddb3 = Object.keys(_0x4bf1a8.gamePaths).find(_0x207a32 => _0x4bf1a8.gamePaths[_0x207a32] === _0x26b523);
        if (_0x54ddb3) {
          if (!_0x4bf1a8.playTime) {
            _0x4bf1a8.playTime = {};
          }
          _0x4bf1a8.playTime[_0x54ddb3] = (_0x4bf1a8.playTime[_0x54ddb3] || 0) + currentSessionMinutes % 5;
          if (!_0x4bf1a8.lastPlayedTimestamps) {
            _0x4bf1a8.lastPlayedTimestamps = {};
          }
          _0x4bf1a8.lastPlayedTimestamps[_0x54ddb3] = Date.now();
          await userDataService_1.default.saveData();
          _0x18b2ec?.webContents.send("user-data-updated");
          if (_0x3df33c) {
            _0x3df33c();
          }
        }
      } catch (_0x38123c) {
        console.error("[Launch] Failed to save playtime", _0x38123c);
      }
    }
  });
  _0x4b377d.unref();
  return true;
}