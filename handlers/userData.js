'use strict';

var __importDefault = this && this.__importDefault || function (_0x209d5c) {
  if (_0x209d5c && _0x209d5c.__esModule) {
    return _0x209d5c;
  } else {
    return {
      default: _0x209d5c
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerUserDataHandlers = registerUserDataHandlers;
const electron_1 = require("electron");
const userDataService_1 = __importDefault(require("../services/userDataService"));
function registerUserDataHandlers(_0x306679, _0x1b2323) {
  electron_1.ipcMain.handle("user-data-get", async (_0x43becb, _0x27df0c) => {
    return await userDataService_1.default.getData(_0x27df0c);
  });
  electron_1.ipcMain.handle("user-data-set", async (_0x3d5889, {
    key: _0xa62c16,
    value: _0x3b524d
  }) => {
    if (_0xa62c16 === "settings" && _0x3b524d && typeof _0x3b524d.runOnStartup === "boolean") {
      electron_1.app.setLoginItemSettings({
        openAtLogin: _0x3b524d.runOnStartup
      });
    }
    const _0x41d144 = await userDataService_1.default.setData(_0xa62c16, _0x3b524d);
    if (_0x306679) {
      _0x306679.webContents.send("user-data-updated");
    }
    return _0x41d144;
  });
  electron_1.ipcMain.handle("user-data-all", async (_0x1384af, _0xd951ee) => {
    if (_0xd951ee) {
      if (_0xd951ee.settings && typeof _0xd951ee.settings.runOnStartup === "boolean") {
        electron_1.app.setLoginItemSettings({
          openAtLogin: _0xd951ee.settings.runOnStartup
        });
      }
      const _0x1775b4 = await userDataService_1.default.setAllData(_0xd951ee);
      if (_0x306679) {
        _0x306679.webContents.send("user-data-updated");
        if (_0x1b2323) {
          _0x1b2323();
        }
      }
      return _0x1775b4;
    }
    return await userDataService_1.default.getData();
  });
  electron_1.ipcMain.handle("user-data-sync-down", async (_0x3ddb57, _0x562439) => {
    console.log("[Main] Syncing remote data down to local file...");
    const _0xc447b = await userDataService_1.default.setAllData(_0x562439);
    if (_0x306679) {}
    return _0xc447b;
  });
}