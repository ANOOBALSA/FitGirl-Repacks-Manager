'use strict';

var __importDefault = this && this.__importDefault || function (_0xba6df6) {
  if (_0xba6df6 && _0xba6df6.__esModule) {
    return _0xba6df6;
  } else {
    return {
      default: _0xba6df6
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
const electron_1 = require("electron");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const fuckingFastHandler_1 = __importDefault(require("../handlers/fuckingFastHandler"));
const userDataService_1 = __importDefault(require("./userDataService"));
class DownloadManager {
  mainWindow;
  activeDownloads = {};
  currentRequests = {};
  ffHandler;
  speedInterval = null;
  constructor(_0x547643) {
    this.mainWindow = _0x547643;
    this.ffHandler = new fuckingFastHandler_1.default(_0x547643);
    this.loadState();
  }
  parseSize(_0x212397) {
    if (!_0x212397) {
      return 0;
    }
    const _0x3d9326 = _0x212397.match(/([\d.,]+)\s*(GB|MB|KB|B)/i);
    if (!_0x3d9326) {
      return 0;
    }
    const _0x439285 = parseFloat(_0x3d9326[1].replace(",", ""));
    const _0x149ef2 = _0x3d9326[2].toUpperCase();
    if (_0x149ef2 === "GB") {
      return Math.floor(_0x439285 * 1024 * 1024 * 1024);
    }
    if (_0x149ef2 === "MB") {
      return Math.floor(_0x439285 * 1024 * 1024);
    }
    if (_0x149ef2 === "KB") {
      return Math.floor(_0x439285 * 1024);
    }
    return Math.floor(_0x439285);
  }
  async loadState() {
    try {
      const _0x2a2c22 = await userDataService_1.default.getData();
      this.activeDownloads = _0x2a2c22.activeDownloads || {};
      for (const _0x4dd9b4 in this.activeDownloads) {
        const _0x1e7d4d = this.activeDownloads[_0x4dd9b4];
        if (_0x1e7d4d.status === "downloading" || _0x1e7d4d.status === "preparing" || _0x1e7d4d.status === "fetching_link") {
          _0x1e7d4d.status = "preparing";
          this.runDownloadLoop(_0x4dd9b4);
        }
      }
      this.mainWindow.webContents.send("active-downloads-loaded", this.activeDownloads);
    } catch (_0x513a02) {
      console.error("[DownloadManager] Load state error:", _0x513a02);
    }
  }
  async saveState() {
    try {
      await userDataService_1.default.setData("activeDownloads", this.activeDownloads);
    } catch (_0x9b45cf) {
      console.error("[DownloadManager] Save state error:", _0x9b45cf);
    }
  }
  async validateLinks(_0x4b0b6c) {
    return await this.ffHandler.validateLinks(_0x4b0b6c);
  }
  async startDownload(_0x292a75, _0x52cb9e, _0x32d93f, _0x4854d5, _0x3c6877, _0x197dd1, _0x5ace60) {
    for (const _0x51d27f in this.activeDownloads) {
      if (_0x51d27f !== _0x292a75 && this.activeDownloads[_0x51d27f].status === "downloading") {
        await this.pauseDownload(_0x51d27f);
      }
    }
    if (this.activeDownloads[_0x292a75]) {
      this.activeDownloads[_0x292a75].status = "preparing";
      if (_0x3c6877) {
        this.activeDownloads[_0x292a75].selectedLinks = _0x3c6877;
      }
      if (_0x52cb9e) {
        this.activeDownloads[_0x292a75].provider = _0x52cb9e;
      }
      this.runDownloadLoop(_0x292a75);
      return {
        success: true
      };
    }
    try {
      await fs_extra_1.default.ensureDir(_0x4854d5);
      this.activeDownloads[_0x292a75] = {
        status: "preparing",
        provider: _0x52cb9e || "Unknown",
        progress: 0,
        totalParts: _0x32d93f.length,
        currentPart: 0,
        folder: _0x4854d5,
        links: _0x32d93f,
        selectedLinks: _0x3c6877 || Array(_0x32d93f.length).fill(true),
        partProgress: Array(_0x32d93f.length).fill(0),
        partDownloaded: Array(_0x32d93f.length).fill(0),
        partTotal: _0x32d93f.map(_0x509406 => _0x197dd1?.[_0x509406] || 0),
        repackTotalSize: this.parseSize(_0x5ace60),
        speed: 0,
        speedHistory: [],
        downloadedSize: 0,
        totalSize: 0
      };
      this.calculateOverallProgress(_0x292a75);
      this.notifyProgress(_0x292a75);
      this.saveState();
      this.runDownloadLoop(_0x292a75);
      return {
        success: true
      };
    } catch (_0x5199f3) {
      console.error("[DownloadManager] Failed to start:", _0x5199f3);
      return {
        success: false,
        error: _0x5199f3.message
      };
    }
  }
  async pauseDownload(_0x3a7999) {
    const _0x307473 = this.activeDownloads[_0x3a7999];
    if (!_0x307473 || _0x307473.status !== "downloading") {
      return {
        success: false
      };
    }
    if (this.currentRequests[_0x3a7999]) {
      this.currentRequests[_0x3a7999].abort();
      delete this.currentRequests[_0x3a7999];
    }
    _0x307473.status = "paused";
    this.notifyProgress(_0x3a7999);
    this.saveState();
    return {
      success: true
    };
  }
  async resumeDownload(_0xcf3256) {
    for (const _0x56d9b3 in this.activeDownloads) {
      if (_0x56d9b3 !== _0xcf3256 && this.activeDownloads[_0x56d9b3].status === "downloading") {
        await this.pauseDownload(_0x56d9b3);
      }
    }
    const _0x37d50f = this.activeDownloads[_0xcf3256];
    if (!_0x37d50f || _0x37d50f.status !== "paused" && _0x37d50f.status !== "error") {
      return {
        success: false
      };
    }
    _0x37d50f.status = "preparing";
    this.notifyProgress(_0xcf3256);
    this.saveState();
    this.runDownloadLoop(_0xcf3256);
    return {
      success: true
    };
  }
  async deleteDownload(_0x5cc81d, _0x314606) {
    const _0x5a68bb = this.activeDownloads[_0x5cc81d];
    if (this.currentRequests[_0x5cc81d]) {
      this.currentRequests[_0x5cc81d].abort();
      delete this.currentRequests[_0x5cc81d];
    }
    const _0x1bcee9 = _0x5a68bb?.folder;
    if (_0x5a68bb) {
      _0x5a68bb.status = "deleted";
      this.notifyProgress(_0x5cc81d);
    }
    delete this.activeDownloads[_0x5cc81d];
    if (_0x314606 && _0x1bcee9) {
      try {
        await fs_extra_1.default.remove(_0x1bcee9);
      } catch (_0xd36721) {
        console.error("[DownloadManager] Clear files error:", _0xd36721);
      }
    }
    const _0x576f14 = await userDataService_1.default.getData();
    if (_0x576f14.downloadedGames?.[_0x5cc81d]) {
      delete _0x576f14.downloadedGames[_0x5cc81d];
      await userDataService_1.default.saveData();
      this.mainWindow.webContents.send("user-data-updated");
    }
    this.saveState();
    return {
      success: true
    };
  }
  async runDownloadLoop(_0xc0b084) {
    const _0x316e0e = this.activeDownloads[_0xc0b084];
    if (!_0x316e0e) {
      return;
    }
    this.startSpeedTracking(_0xc0b084);
    try {
      for (let _0x5bf581 = 0; _0x5bf581 < _0x316e0e.links.length; _0x5bf581++) {
        if (!_0x316e0e.selectedLinks[_0x5bf581]) {
          continue;
        }
        if (_0x316e0e.partProgress[_0x5bf581] === 1) {
          continue;
        }
        if (_0x316e0e.status === "paused" || !this.activeDownloads[_0xc0b084]) {
          break;
        }
        _0x316e0e.currentPart = _0x5bf581 + 1;
        _0x316e0e.status = "fetching_link";
        this.notifyProgress(_0xc0b084);
        const _0xe39e43 = await this.ffHandler.getDownloadUrl(_0x316e0e.links[_0x5bf581]);
        if (_0x316e0e.status === "paused" || !this.activeDownloads[_0xc0b084]) {
          break;
        }
        _0x316e0e.status = "downloading";
        this.notifyProgress(_0xc0b084);
        const _0x1c71c1 = this.getFileNameFromUrl(_0x316e0e.links[_0x5bf581]) || "part" + (_0x5bf581 + 1) + ".rar";
        const _0x17c8fc = path_1.default.join(_0x316e0e.folder, _0x1c71c1);
        let _0x3e6947 = 0;
        if (await fs_extra_1.default.pathExists(_0x17c8fc)) {
          const _0xdd0758 = await fs_extra_1.default.stat(_0x17c8fc);
          _0x3e6947 = _0xdd0758.size;
        }
        await this.downloadFile(_0xc0b084, _0xe39e43, _0x17c8fc, _0x3e6947, _0xea733e => {
          _0x316e0e.partProgress[_0x5bf581] = _0xea733e.progress;
          _0x316e0e.partDownloaded[_0x5bf581] = _0xea733e.downloaded;
          _0x316e0e.partTotal[_0x5bf581] = _0xea733e.total;
          this.calculateOverallProgress(_0xc0b084);
          _0x316e0e.speed = _0xea733e.speed;
          this.notifyProgress(_0xc0b084);
          if (_0x316e0e.progress % 5 === 0) {
            this.saveState();
          }
        });
        if (_0x316e0e.status === "paused") {
          break;
        }
      }
      this.stopSpeedTracking();
      let _0x191b4a = true;
      for (let _0x289161 = 0; _0x289161 < _0x316e0e.links.length; _0x289161++) {
        if (_0x316e0e.selectedLinks[_0x289161] && _0x316e0e.partProgress[_0x289161] < 1) {
          _0x191b4a = false;
          break;
        }
      }
      if (_0x316e0e.status === "downloading" && _0x191b4a) {
        _0x316e0e.status = "unpacking";
        this.notifyProgress(_0xc0b084);
        const _0x9325f8 = await userDataService_1.default.getData("settings");
        if (_0x9325f8.unpackAfterDownload) {
          try {
            await this.unpackRarFiles(_0xc0b084);
          } catch (_0x18e0af) {
            console.error("[DownloadManager] Unpack error:", _0x18e0af);
          }
        }
        _0x316e0e.status = "completed";
        this.notifyProgress(_0xc0b084);
        const _0x24ab54 = await userDataService_1.default.getData();
        if (!_0x24ab54.downloadedGames) {
          _0x24ab54.downloadedGames = {};
        }
        _0x24ab54.downloadedGames[_0xc0b084] = _0x316e0e.folder;
        if (!_0x24ab54.userGames[_0xc0b084]) {
          _0x24ab54.userGames[_0xc0b084] = [];
        }
        if (!_0x24ab54.userGames[_0xc0b084].includes("downloaded")) {
          _0x24ab54.userGames[_0xc0b084] = _0x24ab54.userGames[_0xc0b084].filter(_0x5b690e => _0x5b690e !== "wishlist");
          _0x24ab54.userGames[_0xc0b084].push("downloaded");
        }
        await userDataService_1.default.saveData();
        this.saveState();
        this.mainWindow.webContents.send("user-data-updated");
      }
    } catch (_0x39b518) {
      this.stopSpeedTracking();
      if (_0x39b518.message === "Aborted") {
        return;
      }
      console.error("[DownloadManager] Error for " + _0xc0b084 + ":", _0x39b518);
      if (this.activeDownloads[_0xc0b084]) {
        this.activeDownloads[_0xc0b084].status = "error";
        this.activeDownloads[_0xc0b084].error = _0x39b518.message;
        this.notifyProgress(_0xc0b084);
      }
    }
  }
  calculateOverallProgress(_0x40f093) {
    const _0x505c3d = this.activeDownloads[_0x40f093];
    if (!_0x505c3d) {
      return;
    }
    let _0x2b1574 = 0;
    let _0x3f2ea1 = 0;
    let _0x2cf6da = 0;
    let _0x452036 = 0;
    for (let _0x1babbc = 0; _0x1babbc < _0x505c3d.links.length; _0x1babbc++) {
      if (_0x505c3d.selectedLinks[_0x1babbc]) {
        _0x452036++;
        _0x2b1574 += _0x505c3d.partDownloaded[_0x1babbc] || 0;
        if (_0x505c3d.partTotal[_0x1babbc]) {
          _0x3f2ea1 += _0x505c3d.partTotal[_0x1babbc];
        } else {
          _0x2cf6da++;
        }
      }
    }
    let _0x1c7bfe = _0x3f2ea1;
    if (_0x2cf6da > 0) {
      if (_0x505c3d.repackTotalSize > _0x1c7bfe) {
        _0x1c7bfe = _0x505c3d.repackTotalSize;
      } else if (_0x3f2ea1 > 0) {
        const _0x4070a8 = _0x3f2ea1 / (_0x452036 - _0x2cf6da);
        _0x1c7bfe = _0x3f2ea1 + _0x2cf6da * _0x4070a8;
      }
    }
    _0x505c3d.downloadedSize = _0x2b1574;
    _0x505c3d.totalSize = _0x1c7bfe;
    if (_0x1c7bfe > 0) {
      _0x505c3d.progress = Math.round(_0x2b1574 / _0x1c7bfe * 100);
    } else {
      let _0x3258a4 = 0;
      for (let _0x2d3317 = 0; _0x2d3317 < _0x505c3d.links.length; _0x2d3317++) {
        if (_0x505c3d.selectedLinks[_0x2d3317]) {
          _0x3258a4 += _0x505c3d.partProgress[_0x2d3317] || 0;
        }
      }
      _0x505c3d.progress = _0x452036 > 0 ? Math.round(_0x3258a4 / _0x452036 * 100) : 0;
    }
  }
  startSpeedTracking(_0x5c302f) {
    this.stopSpeedTracking();
    this.speedInterval = setInterval(() => {
      const _0x2ef99a = this.activeDownloads[_0x5c302f];
      if (_0x2ef99a && _0x2ef99a.status === "downloading") {
        _0x2ef99a.speedHistory = _0x2ef99a.speedHistory || [];
        _0x2ef99a.speedHistory.push({
          time: Date.now(),
          speed: _0x2ef99a.speed
        });
        if (_0x2ef99a.speedHistory.length > 60) {
          _0x2ef99a.speedHistory.shift();
        }
        this.notifyProgress(_0x5c302f);
      }
    }, 1000);
  }
  stopSpeedTracking() {
    if (this.speedInterval) {
      clearInterval(this.speedInterval);
      this.speedInterval = null;
    }
  }
  async unpackRarFiles(_0x4c8802) {
    const _0x41091d = this.activeDownloads[_0x4c8802];
    if (!_0x41091d) {
      return;
    }
    const _0xb6a426 = await fs_extra_1.default.readdir(_0x41091d.folder);
    const _0x3c8859 = _0xb6a426.filter(_0xeab86c => _0xeab86c.toLowerCase().endsWith(".rar")).sort().map(_0x34f9e0 => path_1.default.join(_0x41091d.folder, _0x34f9e0));
    if (_0x3c8859.length === 0) {
      console.log("[Unpacker] No RAR files found to unpack");
      return;
    }
    const _0x2eb7f9 = _0x3c8859.filter(_0x55f018 => _0x55f018.toLowerCase().includes(".part1.rar") || _0x55f018.toLowerCase().includes(".part01.rar") || !_0x55f018.toLowerCase().includes(".part") && _0x55f018.toLowerCase().endsWith(".rar"));
    if (_0x2eb7f9.length === 0 && _0x3c8859.length > 0) {
      _0x2eb7f9.push(_0x3c8859[0]);
    }
    console.log("[Unpacker] Found " + _0x2eb7f9.length + " RAR sequences to unpack.");
    for (const _0xe03ed1 of _0x2eb7f9) {
      console.log("[Unpacker] Starting extraction for: " + path_1.default.basename(_0xe03ed1));
      try {
        const {
          createExtractorFromFile: _0x428294
        } = require("node-unrar-js");
        const _0x1884ab = await _0x428294({
          filepath: _0xe03ed1,
          targetPath: _0x41091d.folder
        });
        const {
          files: _0x4979e6
        } = _0x1884ab.extract();
        for (const _0x239fe0 of _0x4979e6) {}
        console.log("[Unpacker] Extraction successful via node-unrar-js: " + path_1.default.basename(_0xe03ed1));
        continue;
      } catch (_0x2bf4fb) {
        console.warn("[Unpacker] node-unrar-js failed for " + path_1.default.basename(_0xe03ed1) + ":", _0x2bf4fb.message);
      }
      try {
        const {
          spawn: _0x4cfedc
        } = require("child_process");
        await new Promise((_0x9c6a0f, _0x375012) => {
          const _0x1ab0bd = _0x4cfedc("C:\\Program Files\\WinRAR\\UnRAR.exe", ["x", _0xe03ed1, _0x41091d.folder + "\\", "-y"], {
            stdio: "pipe"
          });
          let _0x33db8c = "";
          _0x1ab0bd.stderr?.on("data", _0x15d45a => _0x33db8c += _0x15d45a.toString());
          _0x1ab0bd.on("error", _0x280b2a => _0x375012(new Error(_0x280b2a.message)));
          _0x1ab0bd.on("close", _0x1002e1 => _0x1002e1 === 0 ? _0x9c6a0f() : _0x375012(new Error("WinRAR exited " + _0x1002e1 + ". " + _0x33db8c)));
        });
        console.log("[Unpacker] Extraction successful via WinRAR: " + path_1.default.basename(_0xe03ed1));
      } catch (_0x23ef86) {
        console.error("[Unpacker] Extraction FAILED for " + path_1.default.basename(_0xe03ed1) + ":", _0x23ef86.message);
      }
    }
  }
  getFileNameFromUrl(_0x208288) {
    try {
      if (_0x208288.includes("#")) {
        return _0x208288.split("#")[1];
      }
      const _0x30f347 = _0x208288.split("/");
      return _0x30f347[_0x30f347.length - 1];
    } catch (_0x6c31af) {
      return null;
    }
  }
  downloadFile(_0x3df7c6, _0x1aed5b, _0x57c7b2, _0x56727d, _0x589adb) {
    return new Promise((_0x59aa6e, _0x2a8fd0) => {
      const _0x223df9 = {
        method: "GET",
        headers: {}
      };
      if (_0x56727d > 0) {
        _0x223df9.headers.Range = "bytes=" + _0x56727d + "-";
      }
      const _0x4a65f6 = electron_1.net.request({
        url: _0x1aed5b,
        ..._0x223df9
      });
      this.currentRequests[_0x3df7c6] = _0x4a65f6;
      let _0x107c12 = Date.now();
      let _0x49e33f = 0;
      _0x4a65f6.on("response", _0x5b4d89 => {
        const _0x1eb37f = _0x5b4d89.statusCode === 206;
        const _0x2cc9a2 = parseInt(_0x5b4d89.headers["content-length"], 10) || 0;
        const _0x22d0a0 = _0x2cc9a2 + (_0x1eb37f ? _0x56727d : 0);
        let _0x2c139b = _0x56727d;
        const _0x1d4886 = fs_extra_1.default.createWriteStream(_0x57c7b2, {
          flags: _0x56727d > 0 ? "a" : "w"
        });
        _0x5b4d89.on("data", _0x207eb7 => {
          _0x2c139b += _0x207eb7.length;
          _0x1d4886.write(_0x207eb7);
          const _0xe471fe = Date.now();
          const _0x51453c = _0xe471fe - _0x107c12;
          if (_0x51453c >= 1000) {
            const _0x58fe55 = (_0x2c139b - _0x56727d - _0x49e33f) / (_0x51453c / 1000);
            _0x49e33f = _0x2c139b - _0x56727d;
            _0x107c12 = _0xe471fe;
            _0x589adb({
              progress: _0x22d0a0 ? _0x2c139b / _0x22d0a0 : 0,
              downloaded: _0x2c139b,
              total: _0x22d0a0,
              speed: _0x58fe55
            });
          } else if (_0x2c139b === _0x22d0a0) {
            _0x589adb({
              progress: 1,
              downloaded: _0x2c139b,
              total: _0x22d0a0,
              speed: 0
            });
          }
        });
        _0x5b4d89.on("end", () => {
          _0x1d4886.end();
          delete this.currentRequests[_0x3df7c6];
          _0x59aa6e();
        });
        _0x5b4d89.on("error", _0x14a30e => {
          _0x1d4886.close();
          delete this.currentRequests[_0x3df7c6];
          _0x2a8fd0(_0x14a30e);
        });
      });
      _0x4a65f6.on("error", _0x217893 => {
        delete this.currentRequests[_0x3df7c6];
        _0x2a8fd0(_0x217893);
      });
      _0x4a65f6.on("abort", () => {
        delete this.currentRequests[_0x3df7c6];
        _0x2a8fd0(new Error("Aborted"));
      });
      _0x4a65f6.end();
    });
  }
  async launchInstaller(_0x1d17fa, _0x3652b7 = {}) {
    const {
      spawn: _0x5ce092
    } = require("child_process");
    const {
      silent = false
    } = _0x3652b7;
    let {
      installDir = null
    } = _0x3652b7;
    if (silent && !installDir) {
      const _0x1d81f9 = await userDataService_1.default.getData();
      if (_0x1d81f9.settings?.defaultInstallDirectory) {
        installDir = _0x1d81f9.settings.defaultInstallDirectory;
      }
    }
    const _0x398f72 = await fs_extra_1.default.readdir(_0x1d17fa);
    const _0x5460d2 = _0x398f72.find(_0x38d39a => _0x38d39a.toLowerCase().startsWith("setup") && _0x38d39a.toLowerCase().endsWith(".exe"));
    if (!_0x5460d2) {
      throw new Error("Could not find setup.exe in " + _0x1d17fa);
    }
    const _0x450085 = path_1.default.join(_0x1d17fa, _0x5460d2);
    const _0x59bdca = async () => {
      try {
        const _0x459af3 = electron_1.app.getPath("desktop");
        const _0x4c3aa9 = process.env.PUBLIC ? path_1.default.join(process.env.PUBLIC, "Desktop") : null;
        const _0x3a5f65 = [_0x459af3];
        if (_0x4c3aa9) {
          _0x3a5f65.push(_0x4c3aa9);
        }
        const _0x3e9576 = [];
        for (const _0x516414 of _0x3a5f65) {
          try {
            const _0x53b731 = await fs_extra_1.default.readdir(_0x516414);
            _0x3e9576.push(..._0x53b731.filter(_0x1be864 => _0x1be864.toLowerCase().endsWith(".lnk")).map(_0x3168f8 => path_1.default.join(_0x516414, _0x3168f8)));
          } catch (_0x26705c) {}
        }
        return _0x3e9576;
      } catch (_0x96a716) {
        return [];
      }
    };
    const _0x2646a8 = await _0x59bdca();
    const _0x56ab9f = _0x1875e9 => new Promise((_0x48ae4b, _0x13f394) => {
      const _0x1e061c = "start /wait \"\" \"" + _0x450085 + "\" " + _0x1875e9.join(" ");
      const _0x4a1eda = _0x5ce092(_0x1e061c, [], {
        cwd: _0x1d17fa,
        stdio: "ignore",
        shell: true
      });
      _0x4a1eda.on("error", _0x588f3a => _0x13f394(_0x588f3a));
      _0x4a1eda.on("close", _0x4cd610 => _0x48ae4b(_0x4cd610));
    });
    let _0x165bf6 = "normal";
    const _0x567d19 = installDir ? "/DIR=\"" + installDir + "\"" : null;
    if (silent) {
      const _0x1bdd61 = ["/VERYSILENT", "/SP-", "/SUPPRESSMSGBOXES", "/NORESTART", "/NOMUSIC", ...(_0x567d19 ? [_0x567d19] : [])];
      const _0x3f8b5c = ["/S", ...(installDir ? ["/D=" + installDir] : [])];
      try {
        await _0x56ab9f(_0x1bdd61);
        _0x165bf6 = "innosetup";
      } catch (_0x345372) {
        try {
          await _0x56ab9f(_0x3f8b5c);
          _0x165bf6 = "nsis";
        } catch (_0x2721b8) {
          await _0x56ab9f([]);
          _0x165bf6 = "normal";
        }
      }
    } else {
      await _0x56ab9f([_0x567d19 || ""]);
    }
    await new Promise(_0x5454a1 => setTimeout(_0x5454a1, 2500));
    const _0x4a53ad = await _0x59bdca();
    const _0x16f548 = _0x4a53ad.filter(_0x2d2bd3 => !_0x2646a8.includes(_0x2d2bd3));
    let _0xae467f = null;
    if (_0x16f548.length > 0) {
      for (const _0xadaf73 of _0x16f548) {
        try {
          const _0x23406e = electron_1.shell.readShortcutLink(_0xadaf73).target;
          if (_0x23406e && _0x23406e.toLowerCase().endsWith(".exe")) {
            _0xae467f = _0x23406e;
            break;
          }
        } catch (_0x130021) {}
      }
    }
    if (!_0xae467f && installDir) {
      const _0x5a149d = async (_0x3f7d70, _0x34691d = 0) => {
        if (_0x34691d > 3) {
          return null;
        }
        try {
          const _0x3da26a = await fs_extra_1.default.readdir(_0x3f7d70, {
            withFileTypes: true
          });
          let _0x5c53a2 = null;
          let _0x128373 = 0;
          for (const _0x1d4fe9 of _0x3da26a) {
            const _0x4c5e0a = path_1.default.join(_0x3f7d70, _0x1d4fe9.name);
            const _0x58da5e = _0x1d4fe9.name.toLowerCase();
            if (_0x1d4fe9.isDirectory()) {
              if (["_redist", "redist", "directx", "vcredist", "bonus", "soundtrack"].includes(_0x58da5e)) {
                continue;
              }
              const _0x4311bc = await _0x5a149d(_0x4c5e0a, _0x34691d + 1);
              if (_0x4311bc && _0x4311bc.size > _0x128373) {
                _0x5c53a2 = _0x4311bc.path;
                _0x128373 = _0x4311bc.size;
              }
            } else if (_0x1d4fe9.isFile() && _0x58da5e.endsWith(".exe")) {
              if (_0x58da5e.includes("unins") || _0x58da5e.includes("crash") || _0x58da5e.includes("dxwebsetup") || _0x58da5e.includes("vcredist")) {
                continue;
              }
              const _0x24ee60 = await fs_extra_1.default.stat(_0x4c5e0a);
              if (_0x24ee60.size > _0x128373) {
                _0x5c53a2 = _0x4c5e0a;
                _0x128373 = _0x24ee60.size;
              }
            }
          }
          if (_0x5c53a2) {
            return {
              path: _0x5c53a2,
              size: _0x128373
            };
          } else {
            return null;
          }
        } catch (_0x62580c) {
          return null;
        }
      };
      const _0x53e855 = await _0x5a149d(installDir);
      if (_0x53e855 && _0x53e855.path) {
        _0xae467f = _0x53e855.path;
      }
    }
    return {
      success: true,
      method: _0x165bf6,
      newExePath: _0xae467f
    };
  }
  notifyProgress(_0x56efd9) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send("download-progress", {
        gameId: _0x56efd9,
        ...this.activeDownloads[_0x56efd9]
      });
    }
  }
}
exports.default = DownloadManager;