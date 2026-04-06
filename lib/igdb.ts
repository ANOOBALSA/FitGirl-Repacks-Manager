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
}

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
    top_all: () =>
      `sort total_rating desc; where total_rating_count > 500 & cover != null & platforms = (6);`,
    top_year: (year: number) => {
      const start = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
      const end = Math.floor(new Date(`${year}-12-31`).getTime() / 1000);
      return `sort total_rating desc; where first_release_date >= ${start} & first_release_date <= ${end} & total_rating_count > 50 & cover != null & platforms = (6);`;
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
      return `sort first_release_date desc; where first_release_date <= ${now} & total_rating_count > 5 & cover != null & platforms = (6);`;
    },
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

    if (queryType === "search") {
      const searchTerm = IgdbService.getQueries.search(params);
      const query = `
        search "${searchTerm}";
        fields name, summary, cover.image_id, cover.url, first_release_date, total_rating, genres.name, platforms.name;
        where platforms = (6) & cover != null;
        limit ${limit};
        offset ${offset};
      `;
      return igdbFetch("games", query).then(IgdbService.normalizeUrls);
    } else if (queryType === "top_year") {
      baseQuery = IgdbService.getQueries.top_year(
        params || new Date().getFullYear(),
      );
    } else if ((IgdbService.getQueries as any)[queryType]) {
      baseQuery = (IgdbService.getQueries as any)[queryType]();
    } else {
      baseQuery = IgdbService.getQueries.top_all();
    }

    const query = `
      fields name, summary, cover.image_id, cover.url, first_release_date, total_rating, genres.name, platforms.name;
      ${baseQuery}
      limit ${limit};
      offset ${offset};
    `;
    return igdbFetch("games", query).then(IgdbService.normalizeUrls);
  },

  getCount: async (queryType: string, params?: any) => {
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
