import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs-extra";
import mapgenie from "../services/mapgenieService";

export function registerMapGenieHandlers(): void {
  ipcMain.handle("mapgenie-search", async (_event, gameTitle: string) => {
    return await mapgenie.searchForMap(gameTitle);
  });

  ipcMain.handle("get-mapgenie-preload", () => {
    const isDev = !require("electron").app.isPackaged;
    const preloadPath = isDev
      ? require("path").join(__dirname, "..", "preload-webview.js")
      : require("path").join(
          process.resourcesPath,
          "app.asar",
          "dist",
          "preload-webview.js",
        );
    return `file://${preloadPath}`;
  });

  const getDataPath = () => path.join(app.getPath("userData"), "Data", "mapgenie_data.json");

  ipcMain.handle("mapgenie-get-data", async () => {
    const dataPath = getDataPath();
    if (await fs.pathExists(dataPath)) {
      return await fs.readJson(dataPath);
    }
    return { locations: {}, categories: [] };
  });

  ipcMain.handle("mapgenie-set-data", async (_event, data: any) => {
    const dataPath = getDataPath();
    await fs.ensureDir(path.dirname(dataPath));
    await fs.writeJson(dataPath, data);
    return true;
  });
}
