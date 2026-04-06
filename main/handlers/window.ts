import { ipcMain, app, BrowserWindow } from "electron";

export function registerWindowHandlers(mainWindow: BrowserWindow): void {
  ipcMain.on("window-minimize", () => mainWindow?.minimize());
  ipcMain.on("window-maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-state-changed", { isMaximized: true });
  });

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window-state-changed", { isMaximized: false });
  });

  ipcMain.on("window-is-maximized", (_event) => {
    _event.returnValue = mainWindow?.isMaximized();
  });
  ipcMain.on("window-hide", () => {
    mainWindow?.hide();
  });
  ipcMain.on("window-close", () => {
    app.quit();
  });
  ipcMain.on("window-devtools", () => {
    if (mainWindow?.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
  });
}
