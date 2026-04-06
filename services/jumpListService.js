'use strict';

var __importDefault = this && this.__importDefault || function (_0x467262) {
  if (_0x467262 && _0x467262.__esModule) {
    return _0x467262;
  } else {
    return {
      default: _0x467262
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateJumpList = updateJumpList;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const userDataService_1 = __importDefault(require("./userDataService"));
const trayService_1 = __importDefault(require("./trayService"));
async function updateJumpList(_0x260707) {
  if (process.platform !== "win32") {
    return;
  }
  try {
    const _0x5bd4a3 = await userDataService_1.default.getData();
    const _0x37d44f = _0x5bd4a3.lastPlayedTimestamps || {};
    const _0x44bd6a = _0x5bd4a3.gamePaths || {};
    const _0x2b88b4 = Object.keys(_0x37d44f).sort((_0x40c0a2, _0x340934) => _0x37d44f[_0x340934] - _0x37d44f[_0x40c0a2]);
    const _0x454bfd = _0x2b88b4.filter(_0x2685f9 => !!_0x44bd6a[_0x2685f9]).slice(0, 7).map(_0x3c6f8c => ({
      exePath: _0x44bd6a[_0x3c6f8c],
      name: path_1.default.basename(_0x44bd6a[_0x3c6f8c], ".exe")
    }));
    trayService_1.default.updateTrayMenu(_0x260707, () => updateJumpList(_0x260707), _0x454bfd);
    const _0x3d22d7 = _0x454bfd.map(_0x2a0806 => {
      return {
        type: "task",
        title: "Play " + _0x2a0806.name,
        program: _0x2a0806.exePath,
        iconPath: _0x2a0806.exePath,
        iconIndex: 0,
        description: "Launch " + _0x2a0806.name
      };
    });
    electron_1.app.setJumpList([{
      type: "custom",
      name: "Recent Games",
      items: _0x3d22d7
    }]);
  } catch (_0x5e4e27) {
    console.error("[JumpList] Error:", _0x5e4e27);
  }
}