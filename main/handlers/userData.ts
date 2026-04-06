import { ipcMain, BrowserWindow, app } from "electron";
import userData, { UserData } from "../services/userDataService";

export function registerUserDataHandlers(
  mainWindow: BrowserWindow,
  updateJumpList?: () => void,
): void {
  ipcMain.handle("user-data-get", async (_event, key?: keyof UserData) => {
    return await userData.getData(key as any);
  });

  ipcMain.handle(
    "user-data-set",
    async (_event, { key, value }: { key: keyof UserData; value: any }) => {
      if (
        key === "settings" &&
        value &&
        typeof value.runOnStartup === "boolean"
      ) {
        app.setLoginItemSettings({ openAtLogin: value.runOnStartup });
      }
      const result = await userData.setData(key, value);
      if (mainWindow) {
        mainWindow.webContents.send("user-data-updated");
      }
      return result;
    },
  );

  ipcMain.handle("user-data-all", async (_event, data?: Partial<UserData>) => {
    if (data) {
      if (data.settings && typeof data.settings.runOnStartup === "boolean") {
        app.setLoginItemSettings({ openAtLogin: data.settings.runOnStartup });
      }
      const result = await userData.setAllData(data);
      if (mainWindow) {
        mainWindow.webContents.send("user-data-updated");
        if (updateJumpList) updateJumpList();
      }
      return result;
    }
    return await userData.getData();
  });

  ipcMain.handle(
    "user-data-sync-down",
    async (_event, data: Partial<UserData>) => {
      console.log("[Main] Syncing remote data down to local file...");
      const result = await userData.setAllData(data);
      if (mainWindow) {
      }
      return result;
    },
  );
}
