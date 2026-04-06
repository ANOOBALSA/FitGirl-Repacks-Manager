import { ipcMain } from "electron";
import { notificationService } from "../services/notificationService";

export function registerAuthHandlers(): void {
  ipcMain.handle("notify-auth-signin", async (event) => {
    console.log(`[Main] Received sign-in notification, starting services...`);
    await notificationService.start();
  });

  ipcMain.handle("notify-auth-signout", async () => {
    console.log("[Main] Received sign-out notification, stopping services...");
    await notificationService.stop();
  });
}
