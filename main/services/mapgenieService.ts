import { app } from "electron";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs-extra";
import path from "path";

export interface MapGenieGame {
  title: string;
  url: string;
}

class MapGenieService {
  private dataPath: string;
  private maps: MapGenieGame[] | null = null;
  private userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.dataPath = path.join(
      app.getPath("userData"),
      "Data",
      "mapgenieData.json",
    );
  }

  async ensureDataLoaded(): Promise<void> {
    if (this.maps !== null) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      if (await fs.pathExists(this.dataPath)) {
        try {
          this.maps = await fs.readJson(this.dataPath);
          console.log(
            `[MapGenieService] Loaded ${this.maps?.length} maps from ${this.dataPath}`,
          );
        } catch (error) {
          console.error("Error loading mapgenieData.json:", error);
          this.maps = [];
        }
      } else {
        this.maps = [];
        await fs.ensureDir(path.dirname(this.dataPath));
        await this.scrapeAllMaps();
      }
      this.loadPromise = null;
    })();

    return this.loadPromise;
  }

  async saveData(): Promise<void> {
    if (this.maps === null) return;
    try {
      await fs.writeJson(this.dataPath, this.maps, { spaces: 2 });
    } catch (error) {
      console.error("Error saving mapgenieData.json:", error);
    }
  }

  async scrapeAllMaps(): Promise<void> {
    console.log("[MapGenieService] Scraping maps from mapgenie.io...");
    try {
      const response = await axios.get("https://mapgenie.io/", {
        headers: { "User-Agent": this.userAgent },
      });
      const $ = cheerio.load(response.data);
      const newMaps: MapGenieGame[] = [];

      $(".game-card-wrapper").each((_, el) => {
        const link = $(el).find("a.game-item");
        const title = $(el).find(".card-title").text().trim();
        const url = link.attr("href");

        if (title && url) {
          newMaps.push({ title, url });
        }
      });

      if (newMaps.length > 0) {
        this.maps = newMaps;
        await this.saveData();
        console.log(
          `[MapGenieService] Successfully scraped ${newMaps.length} maps.`,
        );
      }
    } catch (error) {
      console.error("[MapGenieService] Scrape failed:", error);
      if (this.maps === null) this.maps = [];
    }
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async searchForMap(gameTitle: string): Promise<string | null> {
    await this.ensureDataLoaded();
    if (!this.maps || this.maps.length === 0) return null;

    const normalizedSearch = this.normalizeTitle(gameTitle);

    let match = this.maps.find(
      (m) => this.normalizeTitle(m.title) === normalizedSearch,
    );
    if (match) return match.url;

    match = this.maps.find((m) => {
      const normMapTitle = this.normalizeTitle(m.title);
      return (
        normMapTitle.includes(normalizedSearch) ||
        normalizedSearch.includes(normMapTitle)
      );
    });

    return match ? match.url : null;
  }
}

const instance = new MapGenieService();
export default instance;
