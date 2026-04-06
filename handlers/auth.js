'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerAuthHandlers = registerAuthHandlers;
const electron_1 = require("electron");
const notificationService_1 = require("../services/notificationService");
function registerAuthHandlers() {
  electron_1.ipcMain.handle("notify-auth-signin", async (_0x401ae8, _0x1d24e0) => {
    console.log("[Main] Received sign-in notification (Premium: " + _0x1d24e0 + "), starting services...");
    await notificationService_1.notificationService.start(_0x1d24e0);
  });
  electron_1.ipcMain.handle("notify-auth-signout", async () => {
    console.log("[Main] Received sign-out notification, stopping services...");
    await notificationService_1.notificationService.stop();
  });
}