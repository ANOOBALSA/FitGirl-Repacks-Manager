'use strict';

var __importDefault = this && this.__importDefault || function (_0x560e5c) {
  if (_0x560e5c && _0x560e5c.__esModule) {
    return _0x560e5c;
  } else {
    return {
      default: _0x560e5c
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
const electron_1 = require("electron");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class UserDataService {
  dataPath;
  data;
  constructor() {
    this.dataPath = path_1.default.join(electron_1.app.getPath("userData"), "Data", "userData.json");
    this.data = null;
  }
  async ensureDataLoaded() {
    if (this.data !== null) {
      return;
    }
    if (await fs_extra_1.default.pathExists(this.dataPath)) {
      try {
        const _0x444e27 = await fs_extra_1.default.readJson(this.dataPath);
        const _0x4bc429 = this.getDefaultData();
        this.data = {
          ..._0x4bc429,
          ..._0x444e27,
          settings: {
            ..._0x4bc429.settings,
            ..._0x444e27.settings
          }
        };
      } catch (_0x568840) {
        console.error("Error loading userData.json:", _0x568840);
        this.data = this.getDefaultData();
      }
    } else {
      this.data = this.getDefaultData();
      await fs_extra_1.default.ensureDir(path_1.default.dirname(this.dataPath));
      await this.saveData();
    }
  }
  getDefaultData() {
    return {
      userGames: {},
      statusTimestamps: {},
      readRepacks: [],
      repackIgdbMapping: {},
      virtualGames: {},
      gamePaths: {},
      gameDs4Settings: {},
      playTime: {},
      lastPlayedTimestamps: {},
      activeDownloads: {},
      downloadedGames: {},
      settings: {
        downloadDirectory: path_1.default.join(electron_1.app.getPath("downloads"), "FitGirl Repacks Manager"),
        defaultInstallDirectory: path_1.default.join(electron_1.app.getPath("home"), "Games", "FitGirl Repacks Manager"),
        unpackAfterDownload: true,
        closeToTray: true,
        runOnStartup: false,
        startMinimized: false,
        ds4WindowsPath: "",
        notificationMode: "all"
      },
      migrationVersion: 1
    };
  }
  async saveData() {
    if (this.data === null) {
      return;
    }
    try {
      await fs_extra_1.default.writeJson(this.dataPath, this.data, {
        spaces: 2
      });
    } catch (_0x3129d5) {
      console.error("Error saving userData.json:", _0x3129d5);
    }
  }
  async getData(_0x54a9de) {
    await this.ensureDataLoaded();
    if (!this.data) {
      throw new Error("Data not initialized");
    }
    if (_0x54a9de) {
      return this.data[_0x54a9de];
    }
    return this.data;
  }
  async setData(_0x254479, _0x7f82c5) {
    await this.ensureDataLoaded();
    if (!this.data) {
      throw new Error("Data not initialized");
    }
    this.data[_0x254479] = _0x7f82c5;
    await this.saveData();
    return true;
  }
  async setAllData(_0x292025) {
    await this.ensureDataLoaded();
    if (!this.data) {
      throw new Error("Data not initialized");
    }
    const _0x620975 = this.data;
    const _0x3b6794 = ["userGames", "statusTimestamps", "repackIgdbMapping", "virtualGames", "gamePaths", "gameDs4Settings", "activeDownloads", "downloadedGames"];
    for (const _0x5f10cf of _0x3b6794) {
      const _0x3e3b38 = _0x292025[_0x5f10cf];
      if (_0x3e3b38 && typeof _0x3e3b38 === "object" && !Array.isArray(_0x3e3b38)) {
        _0x620975[_0x5f10cf] = _0x3e3b38;
      }
    }
    if (_0x292025.readRepacks) {
      _0x620975.readRepacks = Array.from(new Set([..._0x620975.readRepacks, ..._0x292025.readRepacks]));
    }
    const _0x30b6c8 = ["playTime", "lastPlayedTimestamps"];
    for (const _0x3b9b6c of _0x30b6c8) {
      const _0x38daa9 = _0x292025[_0x3b9b6c];
      if (_0x38daa9 && typeof _0x38daa9 === "object") {
        const _0x41ba77 = _0x38daa9;
        const _0x43f177 = _0x620975[_0x3b9b6c];
        for (const _0x41ef11 in _0x41ba77) {
          _0x43f177[_0x41ef11] = Math.max(_0x43f177[_0x41ef11] || 0, _0x41ba77[_0x41ef11]);
        }
      }
    }
    if (_0x292025.settings) {
      _0x620975.settings = {
        ..._0x620975.settings,
        ..._0x292025.settings
      };
    }
    if (_0x292025.migrationVersion !== undefined) {
      _0x620975.migrationVersion = Math.max(_0x620975.migrationVersion, _0x292025.migrationVersion);
    }
    await this.saveData();
    return true;
  }
}
const instance = new UserDataService();
exports.default = instance;