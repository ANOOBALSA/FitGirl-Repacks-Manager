'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createTray = createTray;
exports.updateTrayMenu = updateTrayMenu;
exports.getTray = getTray;
const electron_1 = require("electron");
const utils_1 = require("../utils");
const games_1 = require("../handlers/games");
let tray = null;
function createTray(_0x500853, _0x3c0030) {
  try {
    const _0x111ab7 = (0, utils_1.getAssetPath)("app_icon.png");
    console.log("[Tray] Loading icon from:", _0x111ab7);
    const _0x4204ff = electron_1.nativeImage.createFromPath(_0x111ab7);
    const _0x455e46 = _0x4204ff.resize({
      width: 16,
      height: 16
    });
    tray = new electron_1.Tray(_0x455e46.isEmpty() ? _0x111ab7 : _0x455e46);
    const _0x1c431f = electron_1.Menu.buildFromTemplate([{
      label: "Open FitGirl Repacks Manager",
      click: () => {
        _0x500853.show();
      }
    }, {
      type: "separator"
    }, {
      label: "Quit",
      click: () => {
        electron_1.app.isQuitting = true;
        electron_1.app.quit();
      }
    }]);
    tray.setToolTip("FitGirl Repacks Manager");
    tray.setContextMenu(_0x1c431f);
    tray.on("double-click", () => {
      _0x500853.show();
    });
    return tray;
  } catch (_0x276696) {
    console.error("[Tray] Could not create system tray:", _0x276696);
    return null;
  }
}
function updateTrayMenu(_0x7fcc8c, _0x10d392, _0x3cdb5b = []) {
  if (!tray) {
    return;
  }
  const _0x59b895 = _0x3cdb5b.map(_0x55456c => {
    const _0x195006 = electron_1.nativeImage.createFromPath(_0x55456c.exePath).resize({
      width: 16,
      height: 16
    });
    return {
      label: "Play " + _0x55456c.name,
      icon: _0x195006.isEmpty() ? undefined : _0x195006,
      click: () => {
        (0, games_1.launchGameAction)(_0x7fcc8c, _0x55456c.exePath, _0x10d392);
      }
    };
  });
  const _0x823005 = [{
    label: "Open FitGirl Repacks Manager",
    click: () => {
      _0x7fcc8c.show();
    }
  }, {
    type: "separator"
  }];
  if (_0x59b895.length > 0) {
    _0x823005.push({
      label: "Recent Games",
      enabled: false
    });
    _0x823005.push(..._0x59b895);
    _0x823005.push({
      type: "separator"
    });
  }
  _0x823005.push({
    label: "Quit",
    click: () => {
      electron_1.app.isQuitting = true;
      electron_1.app.quit();
    }
  });
  const _0xfab35f = electron_1.Menu.buildFromTemplate(_0x823005);
  tray.setContextMenu(_0xfab35f);
}
function getTray() {
  return tray;
}
const trayService = {
  createTray: createTray,
  updateTrayMenu: updateTrayMenu,
  getTray: getTray
};
exports.default = trayService;