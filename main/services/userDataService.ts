import { app } from "electron";
import fs from "fs-extra";
import path from "path";

export interface UserSettings {
  downloadDirectory: string;
  defaultInstallDirectory: string;
  unpackAfterDownload: boolean;
  closeToTray: boolean;
  runOnStartup: boolean;
  startMinimized: boolean;
  ds4WindowsPath: string;
  notificationMode: "all" | "library" | "disabled";
}

export interface UserData {
  userGames: Record<string, any>;
  statusTimestamps: Record<string, number>;
  readRepacks: string[];
  repackIgdbMapping: Record<string, number>;
  virtualGames: Record<string, any>;
  gamePaths: Record<string, string>;
  gameDs4Settings: Record<string, boolean>;
  playTime: Record<string, number>;
  lastPlayedTimestamps: Record<string, number>;
  activeDownloads: Record<string, any>;
  downloadedGames: Record<string, any>;
  settings: UserSettings;
  migrationVersion: number;
}

class UserDataService {
  private dataPath: string;
  private data: UserData | null;

  constructor() {
    this.dataPath = path.join(app.getPath("userData"), "Data", "userData.json");
    this.data = null;
  }

  async ensureDataLoaded(): Promise<void> {
    if (this.data !== null) return;

    if (await fs.pathExists(this.dataPath)) {
      try {
        const loadedData = await fs.readJson(this.dataPath);
        const defaultData = this.getDefaultData();
        this.data = {
          ...defaultData,
          ...loadedData,
          settings: { ...defaultData.settings, ...loadedData.settings },
        };
      } catch (error) {
        console.error("Error loading userData.json:", error);
        this.data = this.getDefaultData();
      }
    } else {
      this.data = this.getDefaultData();
      await fs.ensureDir(path.dirname(this.dataPath));
      await this.saveData();
    }
  }

  getDefaultData(): UserData {
    return {
      userGames: {},
      statusTimestamps: {},
      readRepacks: [],
      repackIgdbMapping: {},
      virtualGames: {},
      gamePaths: {},
      gameDs4Settings: {},
      playTime: {},
      lastPlayedTimestamps: {},
      activeDownloads: {},
      downloadedGames: {},
      settings: {
        downloadDirectory: path.join(
          app.getPath("downloads"),
          "FitGirl Repacks Manager",
        ),
        defaultInstallDirectory: path.join(
          app.getPath("home"),
          "Games",
          "FitGirl Repacks Manager",
        ),
        unpackAfterDownload: true,
        closeToTray: true,
        runOnStartup: false,
        startMinimized: false,
        ds4WindowsPath: "",
        notificationMode: "all",
      },
      migrationVersion: 1,
    };
  }

  async saveData(): Promise<void> {
    if (this.data === null) return;
    try {
      await fs.writeJson(this.dataPath, this.data, { spaces: 2 });
    } catch (error) {
      console.error("Error saving userData.json:", error);
    }
  }

  async getData(): Promise<UserData>;
  async getData<K extends keyof UserData>(key: K): Promise<UserData[K]>;
  async getData<K extends keyof UserData>(
    key?: K,
  ): Promise<UserData | UserData[K]> {
    await this.ensureDataLoaded();
    if (!this.data) throw new Error("Data not initialized");
    if (key) return this.data[key];
    return this.data;
  }

  async setData<K extends keyof UserData>(
    key: K,
    value: UserData[K],
  ): Promise<boolean> {
    await this.ensureDataLoaded();
    if (!this.data) throw new Error("Data not initialized");
    this.data[key] = value;
    await this.saveData();
    return true;
  }

  async setAllData(newData: Partial<UserData>): Promise<boolean> {
    await this.ensureDataLoaded();
    if (!this.data) throw new Error("Data not initialized");

    const current = this.data;

    const recordFields: (keyof UserData)[] = [
      "userGames",
      "statusTimestamps",
      "repackIgdbMapping",
      "virtualGames",
      "gamePaths",
      "gameDs4Settings",
      "activeDownloads",
      "downloadedGames",
    ];

    for (const field of recordFields) {
      const val = newData[field];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        (current as any)[field] = val;
      }
    }

    if (newData.readRepacks) {
      current.readRepacks = Array.from(
        new Set([...current.readRepacks, ...newData.readRepacks]),
      );
    }

    const maxFields: (keyof UserData)[] = ["playTime", "lastPlayedTimestamps"];
    for (const field of maxFields) {
      const val = newData[field];
      if (val && typeof val === "object") {
        const remoteRecord = val as Record<string, number>;
        const localRecord = (current as any)[field] as Record<string, number>;
        for (const key in remoteRecord) {
          localRecord[key] = Math.max(localRecord[key] || 0, remoteRecord[key]);
        }
      }
    }

    if (newData.settings) {
      current.settings = { ...current.settings, ...newData.settings };
    }

    if (newData.migrationVersion !== undefined)
      current.migrationVersion = Math.max(
        current.migrationVersion,
        newData.migrationVersion,
      );

    await this.saveData();
    return true;
  }
}

const instance = new UserDataService();
export default instance;
