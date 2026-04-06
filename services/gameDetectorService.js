'use strict';

var __importDefault = this && this.__importDefault || function (_0x1704f9) {
  if (_0x1704f9 && _0x1704f9.__esModule) {
    return _0x1704f9;
  } else {
    return {
      default: _0x1704f9
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scanForGames = scanForGames;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const EXCLUDED_KEYWORDS = ["unins", "setup", "install", "crashhandler", "crashpad", "updater", "unitycrashhandler", "dxsetup", "redist", "launcher", "quicksfv", "vcredist", "physx", "dotnet", "vulkan", "ds4windows"];
const GENERIC_LAUNCHERS = ["launcher.exe", "game_launcher.exe", "start.exe"];
async function scanForGames(_0x1cb8ff) {
  const _0x3c234d = [];
  if (!(await fs_extra_1.default.pathExists(_0x1cb8ff))) {
    return [];
  }
  const _0x4e4647 = await fs_extra_1.default.readdir(_0x1cb8ff, {
    withFileTypes: true
  });
  for (const _0xae96aa of _0x4e4647) {
    if (_0xae96aa.isDirectory()) {
      const _0x406b8f = path_1.default.join(_0x1cb8ff, _0xae96aa.name);
      const _0x4b80ed = _0xae96aa.name;
      if (["eagames", "ubisoft", "activision", "origin games", "steamapps"].includes(_0x4b80ed.toLowerCase())) {
        const _0x2285fd = await fs_extra_1.default.readdir(_0x406b8f, {
          withFileTypes: true
        });
        for (const _0x42969f of _0x2285fd) {
          if (_0x42969f.isDirectory()) {
            const _0x55a905 = path_1.default.join(_0x406b8f, _0x42969f.name);
            const _0x54587d = await findExecutablesRecursively(_0x55a905, 0);
            if (_0x54587d.length > 0) {
              _0x3c234d.push({
                detectedName: _0x42969f.name,
                executables: _0x54587d
              });
            }
          }
        }
        continue;
      }
      const _0x1c6731 = await findExecutablesRecursively(_0x406b8f, 0);
      if (_0x1c6731.length > 0) {
        _0x3c234d.push({
          detectedName: _0x4b80ed,
          executables: _0x1c6731
        });
      }
    }
  }
  return _0x3c234d;
}
const ALLOWED_LAUNCHER_KEYWORDS = ["redprelauncher"];
async function findExecutablesRecursively(_0x1e223a, _0x5200e4) {
  if (_0x5200e4 > 5) {
    return [];
  }
  const _0x513072 = [];
  try {
    const _0x3c6870 = await fs_extra_1.default.readdir(_0x1e223a, {
      withFileTypes: true
    });
    for (const _0x3f9681 of _0x3c6870) {
      if (_0x3f9681.isDirectory()) {
        const _0x4abcda = _0x3f9681.name.toLowerCase();
        if (["_redist", "commonredux", "dotnet", "engine", "plugins", "resources"].includes(_0x4abcda)) {
          continue;
        }
        const _0xc26593 = await findExecutablesRecursively(path_1.default.join(_0x1e223a, _0x3f9681.name), _0x5200e4 + 1);
        _0x513072.push(..._0xc26593);
      } else if (_0x3f9681.isFile() && _0x3f9681.name.toLowerCase().endsWith(".exe")) {
        const _0x34870d = _0x3f9681.name.toLowerCase();
        const _0x6713de = EXCLUDED_KEYWORDS.some(_0x237e87 => _0x34870d.includes(_0x237e87)) && !ALLOWED_LAUNCHER_KEYWORDS.some(_0x33e070 => _0x34870d.includes(_0x33e070)) || GENERIC_LAUNCHERS.includes(_0x34870d);
        if (!_0x6713de) {
          _0x513072.push({
            name: _0x3f9681.name,
            path: path_1.default.join(_0x1e223a, _0x3f9681.name)
          });
        }
      }
    }
  } catch (_0x2ae426) {}
  return _0x513072;
}