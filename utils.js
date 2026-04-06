'use strict';

var __importDefault = this && this.__importDefault || function (_0x4af5ea) {
  if (_0x4af5ea && _0x4af5ea.__esModule) {
    return _0x4af5ea;
  } else {
    return {
      default: _0x4af5ea
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isDev = undefined;
exports.getAssetPath = getAssetPath;
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
exports.isDev = !electron_1.app.isPackaged;
function getAssetPath(..._0x12fb0c) {
  if (electron_1.app.isPackaged) {
    return path_1.default.join(electron_1.app.getAppPath(), "out", ..._0x12fb0c);
  }
  return path_1.default.join(electron_1.app.getAppPath(), "public", ..._0x12fb0c);
}