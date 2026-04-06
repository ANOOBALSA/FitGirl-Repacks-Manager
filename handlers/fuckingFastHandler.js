'use strict';

var __createBinding = this && this.__createBinding || (Object.create ? function (_0x1f7f5b, _0x3b95ba, _0x526466, _0x9ac7ca = _0x526466) {
  var _0x23ac78 = Object.getOwnPropertyDescriptor(_0x3b95ba, _0x526466);
  if (!_0x23ac78 || ("get" in _0x23ac78 ? !_0x3b95ba.__esModule : _0x23ac78.writable || _0x23ac78.configurable)) {
    _0x23ac78 = {
      enumerable: true,
      get: function () {
        return _0x3b95ba[_0x526466];
      }
    };
  }
  Object.defineProperty(_0x1f7f5b, _0x9ac7ca, _0x23ac78);
} : function (_0x22691d, _0x2bd69b, _0x42668e, _0x4d520c = _0x42668e) {
  _0x22691d[_0x4d520c] = _0x2bd69b[_0x42668e];
});
var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (_0x353f27, _0x465496) {
  Object.defineProperty(_0x353f27, "default", {
    enumerable: true,
    value: _0x465496
  });
} : function (_0x32e3f4, _0x13ffce) {
  _0x32e3f4.default = _0x13ffce;
});
var __importStar = this && this.__importStar || function () {
  function _0x547845(_0x2c58de) {
    _0x547845 = Object.getOwnPropertyNames || function (_0x21a381) {
      var _0x56de9c = [];
      for (var _0x33ec96 in _0x21a381) {
        if (Object.prototype.hasOwnProperty.call(_0x21a381, _0x33ec96)) {
          _0x56de9c[_0x56de9c.length] = _0x33ec96;
        }
      }
      return _0x56de9c;
    };
    return _0x547845(_0x2c58de);
  }
  return function (_0x16bb89) {
    if (_0x16bb89 && _0x16bb89.__esModule) {
      return _0x16bb89;
    }
    var _0x324f65 = {};
    if (_0x16bb89 != null) {
      for (var _0x24dcaa = _0x547845(_0x16bb89), _0x4384e1 = 0; _0x4384e1 < _0x24dcaa.length; _0x4384e1++) {
        if (_0x24dcaa[_0x4384e1] !== "default") {
          __createBinding(_0x324f65, _0x16bb89, _0x24dcaa[_0x4384e1]);
        }
      }
    }
    __setModuleDefault(_0x324f65, _0x16bb89);
    return _0x324f65;
  };
}();
var __importDefault = this && this.__importDefault || function (_0x440c4d) {
  if (_0x440c4d && _0x440c4d.__esModule) {
    return _0x440c4d;
  } else {
    return {
      default: _0x440c4d
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
const electron_1 = require("electron");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
class FuckingFastHandler {
  mainWindow;
  async sleep(_0x5f2a3d) {
    return new Promise(_0x5dc1ff => setTimeout(_0x5dc1ff, _0x5f2a3d));
  }
  constructor(_0x20d84c) {
    this.mainWindow = _0x20d84c;
  }
  async getDownloadUrl(_0x26526f) {
    return new Promise((_0x327030, _0x5245e8) => {
      const _0x267b80 = new electron_1.BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      let _0x504a18 = false;
      const _0xac873e = setTimeout(() => {
        if (!_0x504a18) {
          _0x267b80.destroy();
          _0x5245e8(new Error("Timeout waiting for FuckingFast download link"));
        }
      }, 30000);
      const _0x52bbf4 = async () => {
        try {
          const _0x3270e5 = await _0x267b80.webContents.executeJavaScript("\n            document.body.innerText.toLowerCase().includes('rate limited')\n          ");
          if (_0x3270e5) {
            if (!_0x504a18) {
              _0x504a18 = true;
              clearTimeout(_0xac873e);
              _0x267b80.destroy();
              _0x5245e8(new Error("RATE_LIMITED"));
            }
            return;
          }
          await _0x267b80.webContents.executeJavaScript("\n            (function() {\n              const btn = document.querySelector('button.gay-button');\n              if (btn) {\n                btn.click();\n              } else {\n                const buttons = Array.from(document.querySelectorAll('button'));\n                const downloadBtn = buttons.find(b => b.textContent?.includes('DOWNLOAD'));\n                if (downloadBtn) downloadBtn.click();\n              }\n            })();\n          ");
        } catch (_0x24ae2a) {
          console.error("[FuckingFast] Script injection error:", _0x24ae2a);
        }
      };
      _0x267b80.webContents.setWindowOpenHandler(({
        url: _0x2e93f8
      }) => {
        if (_0x2e93f8.includes("fuckingfast.co/dl/")) {
          console.log("[FuckingFast] Detected download link in popup: " + _0x2e93f8);
          if (!_0x504a18) {
            _0x504a18 = true;
            clearTimeout(_0xac873e);
            _0x267b80.destroy();
            _0x327030(_0x2e93f8);
          }
          return {
            action: "deny"
          };
        }
        console.log("[FuckingFast] Blocked actual popup: " + _0x2e93f8 + ". Retrying click...");
        setTimeout(_0x52bbf4, 500);
        return {
          action: "deny"
        };
      });
      _0x267b80.webContents.session.once("will-download", (_0x10855c, _0x283203) => {
        _0x10855c.preventDefault();
        const _0x5685a1 = _0x283203.getURL();
        if (!_0x504a18) {
          _0x504a18 = true;
          clearTimeout(_0xac873e);
          _0x267b80.destroy();
          _0x327030(_0x5685a1);
        }
      });
      _0x267b80.loadURL(_0x26526f);
      _0x267b80.webContents.on("did-finish-load", _0x52bbf4);
      _0x267b80.on("closed", () => {
        if (!_0x504a18) {
          clearTimeout(_0xac873e);
          _0x5245e8(new Error("Window closed before download link was captured"));
        }
      });
    });
  }
  async fetchWithRetry(_0x47ed37, _0x58fab3 = 3, _0xfc2a13 = 2000) {
    for (let _0x10b008 = 0; _0x10b008 < _0x58fab3; _0x10b008++) {
      try {
        const _0x4a88fd = await axios_1.default.get(_0x47ed37, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          timeout: 10000
        });
        const _0x5a5764 = typeof _0x4a88fd.data === "string" ? _0x4a88fd.data.toLowerCase() : JSON.stringify(_0x4a88fd.data).toLowerCase();
        if (_0x5a5764.includes("rate limited")) {
          const _0x365ba1 = new Error("Rate Limited");
          _0x365ba1.response = {
            status: 429,
            data: _0x4a88fd.data
          };
          throw _0x365ba1;
        }
        return _0x4a88fd;
      } catch (_0x118b93) {
        const _0x4d8126 = _0x118b93.response?.status === 429;
        const _0x486f1e = _0x10b008 === _0x58fab3 - 1;
        if (_0x4d8126 && !_0x486f1e) {
          const _0x5e5069 = _0xfc2a13 * Math.pow(2, _0x10b008);
          console.log("[FuckingFast] Rate limited on " + _0x47ed37 + ". Retrying in " + _0x5e5069 + "ms...");
          await this.sleep(_0x5e5069);
          continue;
        }
        throw _0x118b93;
      }
    }
  }
  async validateLinks(_0x29558a) {
    const _0x8b10ff = [];
    const _0x15a7e6 = 3;
    for (let _0x29fd20 = 0; _0x29fd20 < _0x29558a.length; _0x29fd20 += _0x15a7e6) {
      const _0x1ac6d6 = _0x29558a.slice(_0x29fd20, _0x29fd20 + _0x15a7e6);
      const _0x2017d5 = await Promise.all(_0x1ac6d6.map(async _0x3483a9 => {
        try {
          await this.sleep(Math.random() * 500);
          const _0x209b53 = await this.fetchWithRetry(_0x3483a9);
          const _0x5de8ac = cheerio.load(_0x209b53.data);
          const _0x98beeb = _0x5de8ac("button.link-button.gay-button, button").filter((_0x4b628e, _0x5a5531) => {
            return _0x5de8ac(_0x5a5531).text().trim().includes("DOWNLOAD");
          });
          if (_0x98beeb.length > 0) {
            const _0x3400b1 = _0x5de8ac("span.text-gray-500, div").text();
            const _0x5b0e4a = _0x3400b1.match(/Size:\s*([\d.,]+)\s*(GB|MB|KB|B)/i);
            let _0x2fd6de = 0;
            if (_0x5b0e4a) {
              const _0x56fde7 = parseFloat(_0x5b0e4a[1].replace(",", ""));
              const _0x30520e = _0x5b0e4a[2].toUpperCase();
              if (_0x30520e === "GB") {
                _0x2fd6de = _0x56fde7 * 1024 * 1024 * 1024;
              } else if (_0x30520e === "MB") {
                _0x2fd6de = _0x56fde7 * 1024 * 1024;
              } else if (_0x30520e === "KB") {
                _0x2fd6de = _0x56fde7 * 1024;
              } else {
                _0x2fd6de = _0x56fde7;
              }
            }
            return {
              url: _0x3483a9,
              status: _0x209b53.status,
              ok: true,
              size: Math.floor(_0x2fd6de)
            };
          } else {
            return {
              url: _0x3483a9,
              status: _0x209b53.status,
              ok: false,
              error: "Download button not found"
            };
          }
        } catch (_0xdb7b02) {
          console.error("[FuckingFast] Validation error for " + _0x3483a9 + ":", _0xdb7b02.message);
          return {
            url: _0x3483a9,
            status: _0xdb7b02.response?.status || 0,
            ok: false,
            error: _0xdb7b02.message
          };
        }
      }));
      _0x8b10ff.push(..._0x2017d5);
      if (_0x29fd20 + _0x15a7e6 < _0x29558a.length) {
        const _0x24f9a8 = 500 + Math.random() * 1000;
        await this.sleep(_0x24f9a8);
      }
    }
    return _0x8b10ff;
  }
}
exports.default = FuckingFastHandler;