import path from "path";
import { app } from "electron";

export const isDev = !app.isPackaged;

export function getAssetPath(...relativePaths: string[]): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "out", ...relativePaths);
  }
  return path.join(app.getAppPath(), "public", ...relativePaths);
}
