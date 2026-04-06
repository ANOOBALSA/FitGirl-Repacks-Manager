'use strict';

var __importDefault = this && this.__importDefault || function (_0xac1a5e) {
  if (_0xac1a5e && _0xac1a5e.__esModule) {
    return _0xac1a5e;
  } else {
    return {
      default: _0xac1a5e
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerDownloadHandlers = registerDownloadHandlers;
const electron_1 = require("electron");
const userDataService_1 = __importDefault(require("../services/userDataService"));
const path_1 = __importDefault(require("path"));
function registerDownloadHandlers(_0x55da8b, _0x1cffc5) {
  electron_1.ipcMain.handle("get-settings", async () => {
    return await userDataService_1.default.getData("settings");
  });
  electron_1.ipcMain.handle("update-settings", async (_0x30b352, _0x2db4c2) => {
    if (typeof _0x2db4c2.runOnStartup === "boolean") {
      electron_1.app.setLoginItemSettings({
        openAtLogin: _0x2db4c2.runOnStartup
      });
    }
    const _0x47a571 = (await userDataService_1.default.getData("settings")) || {};
    return await userDataService_1.default.setData("settings", {
      ..._0x47a571,
      ..._0x2db4c2
    });
  });
  electron_1.ipcMain.handle("start-download", async (_0x16eced, {
    gameId: _0x179442,
    provider: _0x2ecd00,
    links: _0x3e320a,
    folder: _0x118bc3,
    selectedLinks: _0x3abeff,
    partSizes: _0x466ae9,
    repackSize: _0x29ea41
  }) => {
    let _0x2e9b98 = _0x118bc3;
    if (!_0x2e9b98) {
      const _0x3549fe = await userDataService_1.default.getData("settings");
      _0x2e9b98 = path_1.default.join(_0x3549fe.downloadDirectory, _0x179442);
    }
    return _0x1cffc5.startDownload(_0x179442, _0x2ecd00, _0x3e320a, _0x2e9b98, _0x3abeff, _0x466ae9, _0x29ea41);
  });
  electron_1.ipcMain.handle("pause-download", async (_0x21ba7e, _0x30aa8d) => {
    return _0x1cffc5.pauseDownload(_0x30aa8d);
  });
  electron_1.ipcMain.handle("resume-download", async (_0x14536a, _0x8d6c2c) => {
    return _0x1cffc5.resumeDownload(_0x8d6c2c);
  });
  electron_1.ipcMain.handle("delete-download", async (_0x327ddc, {
    gameId: _0x34083f,
    removeFiles: _0x8c3e7b
  }) => {
    return _0x1cffc5.deleteDownload(_0x34083f, _0x8c3e7b);
  });
  electron_1.ipcMain.handle("get-active-downloads", () => {
    return _0x1cffc5.activeDownloads;
  });
  electron_1.ipcMain.handle("toggle-optional-file", async (_0x30ea14, {
    gameId: _0x27d171,
    index: _0x3494e3,
    enabled: _0x1ed608
  }) => {
    const _0xf2e3f9 = _0x1cffc5.activeDownloads[_0x27d171];
    if (!_0xf2e3f9) {
      return {
        success: false
      };
    }
    _0xf2e3f9.selectedLinks[_0x3494e3] = _0x1ed608;
    _0x1cffc5.calculateOverallProgress(_0x27d171);
    _0x1cffc5.saveState();
    _0x1cffc5.notifyProgress(_0x27d171);
    if (_0x1ed608 && _0xf2e3f9.status === "completed") {
      _0xf2e3f9.status = "preparing";
      _0x1cffc5.runDownloadLoop(_0x27d171);
    }
    return {
      success: true
    };
  });
  electron_1.ipcMain.handle("validate-links", async (_0x3f1b8d, _0x1bb49e) => {
    return _0x1cffc5.validateLinks(_0x1bb49e);
  });
  electron_1.ipcMain.handle("launch-installer", async (_0x1eb62f, _0x1d715c, _0x1ccfb2) => {
    return _0x1cffc5.launchInstaller(_0x1d715c, _0x1ccfb2 || {});
  });
}