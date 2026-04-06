'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerWindowHandlers = registerWindowHandlers;
const electron_1 = require("electron");
function registerWindowHandlers(_0x5d1b6e) {
  electron_1.ipcMain.on("window-minimize", () => _0x5d1b6e?.minimize());
  electron_1.ipcMain.on("window-maximize", () => {
    if (_0x5d1b6e?.isMaximized()) {
      _0x5d1b6e.unmaximize();
    } else {
      _0x5d1b6e?.maximize();
    }
  });
  _0x5d1b6e.on("maximize", () => {
    _0x5d1b6e.webContents.send("window-state-changed", {
      isMaximized: true
    });
  });
  _0x5d1b6e.on("unmaximize", () => {
    _0x5d1b6e.webContents.send("window-state-changed", {
      isMaximized: false
    });
  });
  electron_1.ipcMain.on("window-is-maximized", _0x5e5745 => {
    _0x5e5745.returnValue = _0x5d1b6e?.isMaximized();
  });
  electron_1.ipcMain.on("window-hide", () => {
    _0x5d1b6e?.hide();
  });
  electron_1.ipcMain.on("window-close", () => {
    electron_1.app.quit();
  });
  electron_1.ipcMain.on("window-devtools", () => {
    if (_0x5d1b6e?.webContents.isDevToolsOpened()) {
      _0x5d1b6e.webContents.closeDevTools();
    } else {
      _0x5d1b6e?.webContents.openDevTools({
        mode: "detach"
      });
    }
  });
}