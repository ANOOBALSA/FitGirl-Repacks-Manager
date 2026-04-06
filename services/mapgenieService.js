'use strict';

var __createBinding = this && this.__createBinding || (Object.create ? function (_0x275b26, _0x527d97, _0x2a9cfb, _0xf60c82 = _0x2a9cfb) {
  var _0x44c54f = Object.getOwnPropertyDescriptor(_0x527d97, _0x2a9cfb);
  if (!_0x44c54f || ("get" in _0x44c54f ? !_0x527d97.__esModule : _0x44c54f.writable || _0x44c54f.configurable)) {
    _0x44c54f = {
      enumerable: true,
      get: function () {
        return _0x527d97[_0x2a9cfb];
      }
    };
  }
  Object.defineProperty(_0x275b26, _0xf60c82, _0x44c54f);
} : function (_0x1d6fda, _0x2c5c09, _0x19317d, _0x1d87a0 = _0x19317d) {
  _0x1d6fda[_0x1d87a0] = _0x2c5c09[_0x19317d];
});
var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (_0x78e05f, _0x3ba28f) {
  Object.defineProperty(_0x78e05f, "default", {
    enumerable: true,
    value: _0x3ba28f
  });
} : function (_0x56d6e8, _0x18b715) {
  _0x56d6e8.default = _0x18b715;
});
var __importStar = this && this.__importStar || function () {
  function _0x30238b(_0x3aab9c) {
    _0x30238b = Object.getOwnPropertyNames || function (_0x54a530) {
      var _0xeb4c94 = [];
      for (var _0x11fb73 in _0x54a530) {
        if (Object.prototype.hasOwnProperty.call(_0x54a530, _0x11fb73)) {
          _0xeb4c94[_0xeb4c94.length] = _0x11fb73;
        }
      }
      return _0xeb4c94;
    };
    return _0x30238b(_0x3aab9c);
  }
  return function (_0x44bf55) {
    if (_0x44bf55 && _0x44bf55.__esModule) {
      return _0x44bf55;
    }
    var _0x244a25 = {};
    if (_0x44bf55 != null) {
      for (var _0x49d7e6 = _0x30238b(_0x44bf55), _0x62d828 = 0; _0x62d828 < _0x49d7e6.length; _0x62d828++) {
        if (_0x49d7e6[_0x62d828] !== "default") {
          __createBinding(_0x244a25, _0x44bf55, _0x49d7e6[_0x62d828]);
        }
      }
    }
    __setModuleDefault(_0x244a25, _0x44bf55);
    return _0x244a25;
  };
}();
var __importDefault = this && this.__importDefault || function (_0x4fdfee) {
  if (_0x4fdfee && _0x4fdfee.__esModule) {
    return _0x4fdfee;
  } else {
    return {
      default: _0x4fdfee
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
const electron_1 = require("electron");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class MapGenieService {
  dataPath;
  maps = null;
  userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  loadPromise = null;
  constructor() {
    this.dataPath = path_1.default.join(electron_1.app.getPath("userData"), "Data", "mapgenieData.json");
  }
  async ensureDataLoaded() {
    if (this.maps !== null) {
      return;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = (async () => {
      if (await fs_extra_1.default.pathExists(this.dataPath)) {
        try {
          this.maps = await fs_extra_1.default.readJson(this.dataPath);
          console.log("[MapGenieService] Loaded " + this.maps?.length + " maps from " + this.dataPath);
        } catch (_0x229ec3) {
          console.error("Error loading mapgenieData.json:", _0x229ec3);
          this.maps = [];
        }
      } else {
        this.maps = [];
        await fs_extra_1.default.ensureDir(path_1.default.dirname(this.dataPath));
        await this.scrapeAllMaps();
      }
      this.loadPromise = null;
    })();
    return this.loadPromise;
  }
  async saveData() {
    if (this.maps === null) {
      return;
    }
    try {
      await fs_extra_1.default.writeJson(this.dataPath, this.maps, {
        spaces: 2
      });
    } catch (_0x4f169c) {
      console.error("Error saving mapgenieData.json:", _0x4f169c);
    }
  }
  async scrapeAllMaps() {
    console.log("[MapGenieService] Scraping maps from mapgenie.io...");
    try {
      const _0x4c83bf = await axios_1.default.get("https://mapgenie.io/", {
        headers: {
          "User-Agent": this.userAgent
        }
      });
      const _0x374290 = cheerio.load(_0x4c83bf.data);
      const _0x3ab760 = [];
      _0x374290(".game-card-wrapper").each((_0x1d08ba, _0x5e6999) => {
        const _0x148b24 = _0x374290(_0x5e6999).find("a.game-item");
        const _0x3fb8b0 = _0x374290(_0x5e6999).find(".card-title").text().trim();
        const _0x1e16b9 = _0x148b24.attr("href");
        if (_0x3fb8b0 && _0x1e16b9) {
          _0x3ab760.push({
            title: _0x3fb8b0,
            url: _0x1e16b9
          });
        }
      });
      if (_0x3ab760.length > 0) {
        this.maps = _0x3ab760;
        await this.saveData();
        console.log("[MapGenieService] Successfully scraped " + _0x3ab760.length + " maps.");
      }
    } catch (_0x4949ae) {
      console.error("[MapGenieService] Scrape failed:", _0x4949ae);
      if (this.maps === null) {
        this.maps = [];
      }
    }
  }
  normalizeTitle(_0x48d444) {
    return _0x48d444.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  }
  async searchForMap(_0x5c0b9c) {
    await this.ensureDataLoaded();
    if (!this.maps || this.maps.length === 0) {
      return null;
    }
    const _0x277c8d = this.normalizeTitle(_0x5c0b9c);
    let _0x35b433 = this.maps.find(_0x57f2f7 => this.normalizeTitle(_0x57f2f7.title) === _0x277c8d);
    if (_0x35b433) {
      return _0x35b433.url;
    }
    _0x35b433 = this.maps.find(_0x490e06 => {
      const _0xeab50a = this.normalizeTitle(_0x490e06.title);
      return _0xeab50a.includes(_0x277c8d) || _0x277c8d.includes(_0xeab50a);
    });
    if (_0x35b433) {
      return _0x35b433.url;
    } else {
      return null;
    }
  }
}
const instance = new MapGenieService();
exports.default = instance;