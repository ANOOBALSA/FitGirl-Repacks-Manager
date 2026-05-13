export interface Game {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  cover?: {
    id: number;
    image_id: string;
    url: string;
  };
  screenshots?: {
    id: number;
    image_id: string;
    url: string;
  }[];
  videos?: {
    id: number;
    video_id: string;
    name: string;
  }[];
  first_release_date?: number;
  total_rating?: number;
  genres?: { name: string }[];
  platforms?: { name: string }[];
  status?: string;
  total_rating_count?: number;
  involved_companies?: {
    company: { name: string };
    developer: boolean;
    publisher: boolean;
  }[];
  game_modes?: { name: string }[];
  themes?: { name: string }[];
}

export const IGDB_GENRES = [
  { id: 4, name: "Fighting" },
  { id: 5, name: "Shooter" },
  { id: 8, name: "Platform" },
  { id: 9, name: "Puzzle" },
  { id: 10, name: "Racing" },
  { id: 11, name: "Real Time Strategy (RTS)" },
  { id: 12, name: "Role-playing (RPG)" },
  { id: 13, name: "Simulator" },
  { id: 14, name: "Sport" },
  { id: 15, name: "Strategy" },
  { id: 16, name: "Turn-based strategy (TBS)" },
  { id: 24, name: "Tactical" },
  { id: 25, name: "Hack and slash/Beat 'em up" },
  { id: 31, name: "Adventure" },
  { id: 32, name: "Indie" },
  { id: 33, name: "Arcade" },
  { id: 34, name: "Visual Novel" },
  { id: 36, name: "MOBA" },
];

export const IGDB_THEMES = [
  { id: 1, name: "Action" },
  { id: 17, name: "Fantasy" },
  { id: 18, name: "Science fiction" },
  { id: 19, name: "Horror" },
  { id: 21, name: "Survival" },
  { id: 22, name: "Historical" },
  { id: 23, name: "Stealth" },
  { id: 27, name: "Comedy" },
  { id: 33, name: "Sandbox" },
  { id: 38, name: "Open world" },
  { id: 39, name: "Warfare" },
  { id: 43, name: "Mystery" },
];

declare global {
  interface Window {
    electron: {
      igdbRequest: (endpoint: string, body: string) => Promise<any>;
      fitgirlSearch: (gameTitle: string) => Promise<any>;
      fitgirlRefresh: () => Promise<any>;
      fitgirlGetLatest: (params: any) => Promise<any>;
      fitgirlGetGenres: () => Promise<any>;
      fitgirlGetIdsOlderThan: (timestamp: string) => Promise<any>;
      getUserData: (key: string) => Promise<any>;
      setUserData: (key: string, value: any) => Promise<any>;
      allUserData: (data?: any) => Promise<any>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      selectFolder: () => Promise<string | null>;
      scanGames: (folderPath: string) => Promise<any[]>;
      mapgenieSearch: (gameTitle: string) => Promise<string | null>;
      getMapGeniePreload: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      launchGame: (exePath: string) => Promise<boolean>;
    };
  }
}

async function igdbFetch(endpoint: string, body: string) {
  if (typeof window !== "undefined" && window.electron) {
    return window.electron.igdbRequest(endpoint, body);
  }

  const response = await fetch("/api/igdb", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, body }),
  });

  if (!response.ok) {
    throw new Error("Local IGDB proxy failed");
  }

  return response.json();
}

export const IgdbService = {
  getQueries: {
    top_all: () => {
      const end = Math.floor(new Date().getTime() / 1000);
      return `sort total_rating desc; where first_release_date <= ${end} & total_rating_count > 100 & cover != null;`;
    },
    top_year: (year: number) => {
      const start = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
      const end = Math.floor(new Date(`${year}-12-31`).getTime() / 1000);
      return `sort total_rating desc; where first_release_date >= ${start} & first_release_date <= ${end} & total_rating != null & cover != null;`;
    },
    top_month: () => {
      const now = new Date();
      const start = Math.floor(
        new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000,
      );
      const end = Math.floor(
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() / 1000,
      );
      return `sort total_rating desc; where first_release_date >= ${start} & first_release_date <= ${end} & total_rating_count > 5 & cover != null & platforms = (6);`;
    },
    upcoming: () => {
      const now = Math.floor(Date.now() / 1000);
      return `sort hypes desc; where first_release_date > ${now} & cover != null & platforms = (6);`;
    },
    new: () => {
      const now = Math.floor(Date.now() / 1000);
      return `sort first_release_date desc; where first_release_date <= ${now} & total_rating != null & cover != null;`;
    },
    coop: (year?: number) => {
      let query = `where game_modes = (3) & cover != null`;
      if (year) {
        const start = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
        const end = Math.floor(new Date(`${year}-12-31`).getTime() / 1000);
        query += ` & first_release_date >= ${start} & first_release_date <= ${end}`;
      }
      return `sort total_rating desc; ${query} & total_rating != null;`;
    },
    multiplayer: () =>
      `sort total_rating desc; where game_modes = (2) & total_rating != null & cover != null;`,
    search: (text: string) => {
      return text
        .replace(/[\._\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },
  },

  getGames: async (queryType: string, params?: any, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    let baseQuery = "";

    // Check if queryType is a JSON string of filters (new approach)
    if (queryType === "discover") {
      const { genre, theme, mode, filter, year, fromYear, toYear } = params || {};
      let where = ["cover != null"];
      let sort = "total_rating desc";
      // Only restrict to PC if we're not looking at a "Best of" list (All Time, Year, Month)
      if (!filter?.includes("top") && !year && filter !== "most_rated") {
        where.push("platforms = (6)");
      }

      if (genre && genre !== "all") where.push(`genres = (${genre})`);
      if (theme && theme !== "all") where.push(`themes = (${theme})`);
      if (mode === "coop") where.push("game_modes = (3)");
      else if (mode === "multiplayer") where.push("game_modes = (2)");
      else if (mode === "singleplayer") where.push("game_modes = (1)");

      if (filter === "top_year" || year) {
        const y = year || new Date().getFullYear();
        const start = Math.floor(new Date(`${y}-01-01`).getTime() / 1000);
        const end = Math.floor(new Date(`${y}-12-31`).getTime() / 1000);
        where.push(
          `first_release_date >= ${start} & first_release_date <= ${end}`,
        );
        where.push("total_rating != null");
      } else if (filter === "top_month") {
        const now = new Date();
        const start = Math.floor(
          new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000,
        );
        const end = Math.floor(
          new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() / 1000,
        );
        where.push(
          `first_release_date >= ${start} & first_release_date <= ${end}`,
        );
      } else if (filter === "upcoming") {
        const now = Math.floor(Date.now() / 1000);
        where.push(`first_release_date > ${now}`);
        sort = "hypes desc";
      } else if (filter === "new") {
        const now = Math.floor(Date.now() / 1000);
        where.push(`first_release_date <= ${now}`);
        sort = "first_release_date desc";
      } else if (filter === "most_rated") {
        sort = "total_rating_count desc";
        where.push("total_rating != null");
      } else {
        const end = Math.floor(new Date().getTime() / 1000);
        where.push(`first_release_date <= ${end}`);
        where.push("total_rating_count > 100");
        sort = "total_rating desc";
      }

      // Explicit year range overrides
      if (fromYear || toYear) {
        // Remove any existing date filters
        where = where.filter(w => !w.includes("first_release_date"));
        
        if (fromYear) {
          const start = Math.floor(new Date(`${fromYear}-01-01`).getTime() / 1000);
          where.push(`first_release_date >= ${start}`);
        }
        if (toYear) {
          const end = Math.floor(new Date(`${toYear}-12-31`).getTime() / 1000);
          where.push(`first_release_date <= ${end}`);
        }
      }

      const query = `
        fields name, summary, cover.image_id, cover.url, first_release_date, total_rating, genres.name, platforms.name, game_modes.name, themes.name;
        where ${where.join(" & ")};
        sort ${sort};
        limit ${limit};
        offset ${offset};
      `;
      return igdbFetch("games", query).then(IgdbService.normalizeUrls);
    }

    if (queryType === "search") {
      const searchTerm = IgdbService.getQueries.search(params);
      const query = `
        search "${searchTerm}";
        fields name, summary, cover.image_id, cover.url, first_release_date, total_rating, genres.name, platforms.name, game_modes.name, themes.name;
        where platforms = (6) & cover != null;
        limit ${limit};
        offset ${offset};
      `;
      return igdbFetch("games", query).then(IgdbService.normalizeUrls);
    } else if (queryType === "top_year") {
      baseQuery = IgdbService.getQueries.top_year(
        params || new Date().getFullYear(),
      );
    } else if (queryType === "coop") {
      baseQuery = IgdbService.getQueries.coop(params);
    } else if ((IgdbService.getQueries as any)[queryType]) {
      baseQuery = (IgdbService.getQueries as any)[queryType]();
    } else {
      baseQuery = IgdbService.getQueries.top_all();
    }

    const query = `
      fields name, summary, cover.image_id, cover.url, first_release_date, total_rating, genres.name, platforms.name, game_modes.name, themes.name;
      ${baseQuery}
      limit ${limit};
      offset ${offset};
    `;
    return igdbFetch("games", query).then(IgdbService.normalizeUrls);
  },

  getCount: async (queryType: string, params?: any) => {
    if (queryType === "discover") {
      const { genre, theme, mode, filter, year, fromYear, toYear } = params || {};
      let where = ["cover != null"];
      if (!filter?.includes("top") && !year) {
        where.push("platforms = (6)");
      }

      if (genre && genre !== "all") where.push(`genres = (${genre})`);
      if (theme && theme !== "all") where.push(`themes = (${theme})`);
      if (mode === "coop") where.push("game_modes = (3)");
      else if (mode === "multiplayer") where.push("game_modes = (2)");
      else if (mode === "singleplayer") where.push("game_modes = (1)");

      if (filter === "top_year" || year) {
        const y = year || new Date().getFullYear();
        const start = Math.floor(new Date(`${y}-01-01`).getTime() / 1000);
        const end = Math.floor(new Date(`${y}-12-31`).getTime() / 1000);
        where.push(
          `first_release_date >= ${start} & first_release_date <= ${end}`,
        );
        where.push("total_rating != null");
      } else if (filter === "top_month") {
        const now = new Date();
        const start = Math.floor(
          new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000,
        );
        const end = Math.floor(
          new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() / 1000,
        );
        where.push(
          `first_release_date >= ${start} & first_release_date <= ${end}`,
        );
      } else if (filter === "upcoming") {
        const now = Math.floor(Date.now() / 1000);
        where.push(`first_release_date > ${now}`);
      } else if (filter === "new") {
        const now = Math.floor(Date.now() / 1000);
        where.push(`first_release_date <= ${now}`);
      } else if (filter === "most_rated") {
        where.push("total_rating != null");
      } else {
        const end = Math.floor(new Date().getTime() / 1000);
        where.push(`first_release_date <= ${end}`);
        where.push("total_rating_count > 100");
      }

      if (fromYear || toYear) {
        where = where.filter(w => !w.includes("first_release_date"));
        if (fromYear) {
          const start = Math.floor(new Date(`${fromYear}-01-01`).getTime() / 1000);
          where.push(`first_release_date >= ${start}`);
        }
        if (toYear) {
          const end = Math.floor(new Date(`${toYear}-12-31`).getTime() / 1000);
          where.push(`first_release_date <= ${end}`);
        }
      }

      const countQuery = `where ${where.join(" & ")};`;
      const result = await igdbFetch("games/count", countQuery);
      return result.count || 0;
    }

    let baseQuery = "";
    if (queryType === "search") {
      const searchTerm = IgdbService.getQueries.search(params);
      const countQuery = `search "${searchTerm}"; where platforms = (6) & cover != null;`;
      const result = await igdbFetch("games/count", countQuery);
      return result.count || 0;
    } else if (queryType === "top_year") {
      baseQuery = IgdbService.getQueries.top_year(
        params || new Date().getFullYear(),
      );
    } else if (queryType === "coop") {
      baseQuery = IgdbService.getQueries.coop(params);
    } else if ((IgdbService.getQueries as any)[queryType]) {
      baseQuery = (IgdbService.getQueries as any)[queryType]();
    } else {
      baseQuery = IgdbService.getQueries.top_all();
    }

    const countQuery = baseQuery.replace(/sort [^;]+;/g, "").trim();
    const result = await igdbFetch("games/count", countQuery);
    return result.count || 0;
  },

  getGameDetails: async (id: number) => {
    const query = `
      fields name, summary, storyline, cover.image_id, cover.url, screenshots.image_id, screenshots.url, videos.video_id, videos.name, first_release_date, total_rating, total_rating_count, genres.name, platforms.name;
      where id = ${id};
    `;
    const result = await igdbFetch("games", query);
    return IgdbService.normalizeUrls(result[0] || result);
  },

  getGamesByIds: async (ids: number[]) => {
    if (ids.length === 0) return [];
    const query = `
      fields name, summary, storyline, cover.image_id, cover.url, screenshots.image_id, screenshots.url, videos.video_id, videos.name, first_release_date, total_rating, total_rating_count, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where id = (${ids.join(",")});
      limit 500;
    `;
    return igdbFetch("games", query).then(IgdbService.normalizeUrls);
  },

  normalizeUrls: (data: any) => {
    const normalize = (url: string) =>
      url?.startsWith("//") ? `https:${url}` : url;

    const items = Array.isArray(data) ? data : [data];
    items.forEach((game: any) => {
      if (game.cover) game.cover.url = normalize(game.cover.url);
      if (game.screenshots) {
        game.screenshots.forEach((ss: any) => (ss.url = normalize(ss.url)));
      }
    });
    return data;
  },
};
