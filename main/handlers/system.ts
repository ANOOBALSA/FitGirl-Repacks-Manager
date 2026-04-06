import { ipcMain, dialog, BrowserWindow, app, shell } from "electron";
import path from "path";
import fs from "fs";
import log from "electron-log";

interface CachedToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    return cachedToken.access_token;
  }

  const clientId = process.env.NEXT_PUBLIC_IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("IGDB credentials missing in main process");
  }

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" },
  );

  const data = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(`Failed to get IGDB token: ${JSON.stringify(data)}`);
  }

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000 - 60000,
  };

  return cachedToken.access_token;
}

const CACHE_PATH = path.join(app.getPath("userData"), "igdb_cache.json");

function getCache(): Record<string, any> {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    }
  } catch (e) {
    console.error("Failed to read IGDB cache:", e);
  }
  return {};
}

function setCache(cache: Record<string, any>) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error("Failed to write IGDB cache:", e);
  }
}

export function registerSystemHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(
    "igdb-request",
    async (_event, { endpoint, body }: { endpoint: string; body: string }) => {
      const cacheKey = `${endpoint}:${body}`;
      try {
        const token = await getAccessToken();
        const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
          method: "POST",
          headers: {
            "Client-ID": process.env.NEXT_PUBLIC_IGDB_CLIENT_ID!,
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain",
          },
          body: body,
        });

        const data = await response.json();

        if (response.ok && data) {
          const cache = getCache();
          cache[cacheKey] = data;
          setCache(cache);
        }

        return data;
      } catch (error) {
        console.error(
          "IPC IGDB Error (Network failed, checking cache):",
          error,
        );

        const cache = getCache();
        if (cache[cacheKey]) {
          console.log(`[Cache] Returning cached data for ${endpoint}`);
          return cache[cacheKey];
        }

        throw error;
      }
    },
  );

  ipcMain.on(
    "log-to-main",
    (_event, { level, args }: { level: string; args: any[] }) => {
      if ((log as any)[level]) {
        (log as any)[level]("[Renderer]", ...args);
      } else {
        log.info("[Renderer]", ...args);
      }
    },
  );

  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    "select-file",
    async (_event, title: string, filters: Electron.FileFilter[]) => {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: title || "Select File",
        filters: filters || [],
        properties: ["openFile"],
      });
      if (result.canceled) return null;
      return result.filePaths[0];
    },
  );

  ipcMain.on("is-packaged", (event) => {
    event.returnValue = app.isPackaged;
  });

  ipcMain.on("open-external", (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle("open-path", async (_event, path: string) => {
    if (!path) return { success: false, error: "No path provided" };
    const err = await shell.openPath(path);
    if (err) return { success: false, error: err };
    return { success: true };
  });
}
