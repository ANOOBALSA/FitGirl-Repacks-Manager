'use strict';

var __importDefault = this && this.__importDefault || function (_0x219d1b) {
  if (_0x219d1b && _0x219d1b.__esModule) {
    return _0x219d1b;
  } else {
    return {
      default: _0x219d1b
    };
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.notificationService = undefined;
const supabase_js_1 = require("@supabase/supabase-js");
const electron_1 = require("electron");
const windowService_1 = require("./windowService");
const utils_1 = require("../utils");
const userDataService_1 = __importDefault(require("./userDataService"));
class NotificationService {
  supabase = null;
  channel = null;
  async start(_0x4c5af9) {
    if (this.channel) {
      console.log("[NotificationService] Already subscribed, skipping start.");
      return;
    }
    if (!_0x4c5af9) {
      console.warn("[NotificationService] User is not premium. Real-time notifications disabled.");
      return;
    }
    const _0x2227aa = "https://yzrmxomowfgtnurhuzbi.supabase.co" || "";
    const _0x5c1ae6 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6cm14b21vd2ZndG51cmh1emJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTEwMTksImV4cCI6MjA5MDYyNzAxOX0.0-4JOkgLpr-B8VjGUOK-YtHzjxwraVDnME76MLl7t5o" || "";
    const _0x1f9c8b = "FitData" || "FitData";
    if (!_0x2227aa || !_0x5c1ae6) {
      console.warn("[NotificationService] Supabase credentials missing. Real-time notifications disabled.");
      return;
    }
    this.supabase = (0, supabase_js_1.createClient)(_0x2227aa, _0x5c1ae6);
    console.log("[NotificationService] Subscribing to " + _0x1f9c8b + " for new repacks...");
    this.channel = this.supabase.channel("repack-updates").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: _0x1f9c8b
    }, _0x1ead0f => {
      console.log("[NotificationService] NEW REPACK!", _0x1ead0f.new.PostTitle);
      this.handleNewRepack(_0x1ead0f.new);
    });
    this.channel.subscribe((_0x4654b9, _0x1aab16) => {
      if (_0x4654b9 === "SUBSCRIBED") {
        console.log("[NotificationService] Successfully subscribed to Realtime!");
      } else {
        console.error("[NotificationService] Subscription status: " + _0x4654b9, _0x1aab16 || "");
        if (_0x4654b9 === "CHANNEL_ERROR") {
          console.error("[NotificationService] Ensure Realtime is enabled for table 'FitData' in: Database -> Replication -> Source -> FitData");
        }
      }
    });
  }
  async stop() {
    if (this.channel) {
      console.log("[NotificationService] Unsubscribing from Realtime...");
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.supabase = null;
  }
  async handleNewRepack(_0x518415) {
    const _0x207f7b = await userDataService_1.default.getData("settings");
    const _0x3984db = _0x207f7b.notificationMode || "all";
    if (_0x3984db === "disabled") {
      console.log("[NotificationService] Notifications disabled, skipping.");
      return;
    }
    if (_0x3984db === "library") {
      const _0x137e5c = await userDataService_1.default.getData();
      const _0x40129e = Object.values(_0x137e5c.virtualGames || {});
      const _0x556b86 = this.normalizeTitle(_0x518415.PostTitle);
      const _0x488f55 = _0x40129e.some(_0x4960d6 => {
        const _0x2d7fcb = this.normalizeTitle(_0x4960d6.name || "");
        return _0x2d7fcb.includes(_0x556b86) || _0x556b86.includes(_0x2d7fcb) || this.levenshtein(_0x2d7fcb, _0x556b86) < 3;
      });
      if (!_0x488f55) {
        console.log("[NotificationService] Repack \"" + _0x518415.PostTitle + "\" not in library, skipping.");
        return;
      }
      console.log("[NotificationService] Match found in library for \"" + _0x518415.PostTitle + "\"!");
    }
    const _0x2737e0 = _0x518415.PostTitle || "New Repack Added!";
    if (electron_1.Notification.isSupported()) {
      const _0x44b0c4 = new electron_1.Notification({
        icon: (0, utils_1.getAssetPath)("app_icon.png"),
        urgency: "critical",
        title: "New FitGirl Repack!",
        body: _0x2737e0,
        silent: false
      });
      _0x44b0c4.on("click", () => {
        const _0x38daa5 = (0, windowService_1.getMainWindow)();
        if (_0x38daa5) {
          if (_0x38daa5.isMinimized()) {
            _0x38daa5.restore();
          }
          _0x38daa5.show();
          _0x38daa5.focus();
          _0x38daa5.webContents.send("navigate-to-repack", _0x518415);
        }
      });
      _0x44b0c4.show();
    }
    const _0x367031 = (0, windowService_1.getMainWindow)();
    if (_0x367031) {
      _0x367031.webContents.send("new-repack-notification", _0x518415);
    }
  }
  normalizeTitle(_0x42fb92) {
    return _0x42fb92.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  }
  levenshtein(_0x24c314, _0x2cf2df) {
    if (!_0x24c314) {
      return _0x2cf2df.length;
    }
    if (!_0x2cf2df) {
      return _0x24c314.length;
    }
    const _0x444233 = [];
    for (let _0x25b3bd = 0; _0x25b3bd <= _0x2cf2df.length; _0x25b3bd++) {
      _0x444233[_0x25b3bd] = [_0x25b3bd];
    }
    for (let _0x5942e5 = 0; _0x5942e5 <= _0x24c314.length; _0x5942e5++) {
      _0x444233[0][_0x5942e5] = _0x5942e5;
    }
    for (let _0x30e36d = 1; _0x30e36d <= _0x2cf2df.length; _0x30e36d++) {
      for (let _0x46d120 = 1; _0x46d120 <= _0x24c314.length; _0x46d120++) {
        _0x444233[_0x30e36d][_0x46d120] = _0x2cf2df[_0x30e36d - 1] === _0x24c314[_0x46d120 - 1] ? _0x444233[_0x30e36d - 1][_0x46d120 - 1] : Math.min(_0x444233[_0x30e36d - 1][_0x46d120 - 1], _0x444233[_0x30e36d][_0x46d120 - 1], _0x444233[_0x30e36d - 1][_0x46d120]) + 1;
      }
    }
    return _0x444233[_0x2cf2df.length][_0x24c314.length];
  }
}
exports.notificationService = new NotificationService();
exports.default = exports.notificationService;