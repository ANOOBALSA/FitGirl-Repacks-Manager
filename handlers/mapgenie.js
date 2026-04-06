'use strict';

var __importDefault = this && this.__importDefault || function (_0x410319) {
  if (_0x410319 && _0x410319.__esModule) {
    return _0x410319;
  } else {
    return {
      default: _0x410319
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerMapGenieHandlers = registerMapGenieHandlers;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const mapgenieService_1 = __importDefault(require("../services/mapgenieService"));
function registerMapGenieHandlers() {
  electron_1.ipcMain.handle("mapgenie-search", async (_0x26468e, _0x407256) => {
    return await mapgenieService_1.default.searchForMap(_0x407256);
  });
  electron_1.ipcMain.handle("get-mapgenie-preload", () => {
    const _0x1a77ab = !require("electron").app.isPackaged;
    const _0x37786c = _0x1a77ab ? require("path").join(__dirname, "..", "preload-webview.js") : require("path").join(process.resourcesPath, "app.asar", "dist", "preload-webview.js");
    return "file://" + _0x37786c;
  });
  const _0x57d9f2 = () => path_1.default.join(electron_1.app.getPath("userData"), "Data", "mapgenie_data.json");
  electron_1.ipcMain.handle("mapgenie-get-data", async () => {
    const _0x99e0f1 = _0x57d9f2();
    if (await fs_extra_1.default.pathExists(_0x99e0f1)) {
      return await fs_extra_1.default.readJson(_0x99e0f1);
    }
    return {
      locations: {},
      categories: []
    };
  });
  electron_1.ipcMain.handle("mapgenie-set-data", async (_0x23b432, _0x1edff8) => {
    const _0x36226d = _0x57d9f2();
    await fs_extra_1.default.ensureDir(path_1.default.dirname(_0x36226d));
    await fs_extra_1.default.writeJson(_0x36226d, _0x1edff8);
    return true;
  });
}