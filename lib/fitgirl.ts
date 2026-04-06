import { supabase } from "./supabase";

export interface GameUpdate {
  Title: string;
  Url: string;
}

export interface MediaItem {
  type: "image" | "video";
  url: string;
}

export interface DirectLinks {
  Hoster: string;
  Links: Record<string, string[]>;
}

export interface TorrentLink {
  Source: string;
  Magnet: string;
  TorrentFile: string;
  ExternalLink: string;
}

export interface FitGirlPost {
  PostID: string;
  Timestamp: string;
  PostTitle: string;
  PostLink: string;
  PostFileOriginalSize: string;
  PostFileRepackSize: string;
  DirectLinks: DirectLinks[];
  TorrentLinks: TorrentLink[];
  GameUpdates: GameUpdate[];
  Media: MediaItem[];
  RepackFeatures: string[];
  GameDescription: string | null;
  CoverImage: string;
  Genres: string[];
  Companies: string;
  Languages: string;
}

export interface SearchFilters {
  search?: string;
  genres?: string[];
  dateFrom?: string;
  dateTo?: string;
  unreadOnly?: boolean;
  showAdult?: boolean;
  readIds?: string[];
  mode?: "all" | "hypervisor" | "top" | "top-week" | "top-month" | "top-year";
}

export interface PostsResponse {
  items: FitGirlPost[];
  total: number;
}

const TABLE_NAME = process.env.NEXT_PUBLIC_SUPABASE_TABLE_NAME || "FitData";
const GENERIC_WORDS = new Set([
  "the",
  "and",
  "&",
  "of",
  "a",
  "an",
  "for",
  "with",
  "to",
  "in",
  "on",
  "at",
  "by",
  "from",
  "edition",
  "collectors",
  "limited",
  "gold",
  "ultimate",
  "deluxe",
  "repack",
  "build",
  "version",
  "complete",
  "remastered",
  "remake",
  "definitive",
  "digital",
  "game",
  "year",
  "goty",
  "standard",
  "bundle",
  "bonus",
  "all",
  "dlc",
  "dlcs",
  "update",
  "directors",
  "cut",
  "plus",
  "v1",
  "v2",
  "v3",
  "v4",
]);

class FitGirlService {
  async getLatestPosts(
    page = 1,
    pageSize = 20,
    filters: SearchFilters = {},
  ): Promise<PostsResponse> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from(TABLE_NAME).select("*", { count: "exact" });

      const effectiveGenres = [...(filters.genres || [])];
      if (
        filters.mode === "hypervisor" &&
        !effectiveGenres.includes("HYPERVISOR")
      ) {
        effectiveGenres.push("HYPERVISOR");
      }
      if (filters.mode === "top" && !effectiveGenres.includes("Top")) {
        effectiveGenres.push("Top");
      }
      if (filters.mode === "top-week" && !effectiveGenres.includes("TopWeek")) {
        effectiveGenres.push("TopWeek");
      }
      if (
        filters.mode === "top-month" &&
        !effectiveGenres.includes("TopMonth")
      ) {
        effectiveGenres.push("TopMonth");
      }
      if (filters.mode === "top-year" && !effectiveGenres.includes("TopYear")) {
        effectiveGenres.push("TopYear");
      }

      if (filters.mode === "top-week") {
        query = query.order("TopRankWeek", { ascending: true });
      } else if (filters.mode === "top-month") {
        query = query.order("TopRankMonth", { ascending: true });
      } else if (filters.mode === "top-year") {
        query = query.order("TopRankYear", { ascending: true });
      } else {
        query = query.order("Timestamp", { ascending: false });
      }

      if (filters.search) {
        query = query.ilike("PostTitle", `%${filters.search}%`);
      }

      if (effectiveGenres.length > 0) {
        query = query.filter("Genres", "cs", JSON.stringify(effectiveGenres));
      }

      if (filters.dateFrom) {
        query = query.gte("Timestamp", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("Timestamp", filters.dateTo);
      }

      if (filters.unreadOnly && filters.readIds && filters.readIds.length > 0) {
        query = query.not("PostID", "in", filters.readIds);
      }

      if (!filters.showAdult) {
        query = query.not("Genres", "cs", JSON.stringify(["Adult"]));
        query = query.not("Genres", "cs", JSON.stringify(["Hentai"]));
        query = query.not("Genres", "cs", JSON.stringify(["Nudity"]));
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      const items = data ? data.map((row) => this.mapRowToPostSync(row)) : [];

      return {
        items,
        total: count || 0,
      };
    } catch (error) {
      console.error("Error fetching latest posts from Supabase:", error);
      return { items: [], total: 0 };
    }
  }

  private mapRowToPostSync(row: any): FitGirlPost {
    return {
      PostID: row.PostID,
      Timestamp: row.Timestamp,
      PostTitle: row.PostTitle || "",
      PostLink: row.PostLink || "",
      PostFileOriginalSize: row.PostFileOriginalSize || "",
      PostFileRepackSize: row.PostFileRepackSize || "",
      DirectLinks: row.DirectLinks || [],
      TorrentLinks: row.TorrentLinks || [],
      GameUpdates: row.GameUpdates || [],
      Media: row.Media || [],
      RepackFeatures: row.RepackFeatures || [],
      GameDescription: row.GameDescription || null,
      CoverImage: row.CoverImage || "",
      Genres: row.Genres || [],
      Companies: row.Companies || "",
      Languages: row.Languages || "",
    };
  }

  async getAvailableGenres(): Promise<string[]> {
    try {
      const { data, error } = await supabase.from(TABLE_NAME).select("Genres");
      if (error) throw error;

      const genres = new Set<string>();
      data?.forEach((row) => {
        if (Array.isArray(row.Genres)) {
          row.Genres.forEach((g) => genres.add(g));
        }
      });

      return Array.from(genres).sort();
    } catch (error) {
      console.error("Error fetching dynamic genres:", error);
      return [
        "Action",
        "Adventure",
        "Shooter",
        "RPG",
        "Strategy",
        "Simulation",
        "Sports",
        "Racing",
        "Puzzle",
        "Platformer",
        "Horror",
        "Survival",
        "Open World",
      ].sort();
    }
  }

  async scrapeSinglePost(url: string): Promise<FitGirlPost | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("PostLink", url)
        .maybeSingle();

      if (data) return this.mapRowToPostSync(data);
      return null;
    } catch (error) {
      console.error(`Error resolving single post ${url} from Supabase:`, error);
      return null;
    }
  }

  async getPostByID(postId: string): Promise<FitGirlPost | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("PostID", postId)
        .maybeSingle();

      if (error) throw error;
      if (data) return this.mapRowToPostSync(data);
      return null;
    } catch (error) {
      console.error(`Error fetching post ${postId} from Supabase:`, error);
      return null;
    }
  }

  normalizeTitle(title: string): string {
    let t = title.toLowerCase();

    const romanMap: Record<string, string> = {
      " ii": " 2",
      " iii": " 3",
      " iv": " 4",
      " v": " 5",
      " vi": " 6",
      " vii": " 7",
      " viii": " 8",
      " ix": " 9",
      " x": " 10",
      " xi": " 11",
      " xii": " 12",
      " xiii": " 13",
      " xiv": " 14",
      " xv": " 15",
      " xvi": " 16",
      " xvii": " 17",
      " xviii": " 18",
      " xix": " 19",
      " xx": " 20",
    };

    for (const [rom, dig] of Object.entries(romanMap)) {
      t = t.replace(new RegExp(`${rom}\\b`, "g"), dig);
    }

    return t.replace(/[^a-z0-9\s]/g, "").trim();
  }

  async searchForRepack(gameTitle: string): Promise<FitGirlPost[]> {
    const normalizedSearch = this.normalizeTitle(gameTitle);
    if (!normalizedSearch) return [];

    try {
      const searchWords = normalizedSearch
        .split(/\s+/)
        .filter((w) => w.length > 2 || /\d/.test(w));

      if (searchWords.length === 0) return [];

      let query = supabase.from(TABLE_NAME).select("*").limit(100);

      const significantWords = searchWords.filter((w) => !GENERIC_WORDS.has(w));
      const filterWord =
        significantWords.sort((a, b) => b.length - a.length)[0] ||
        searchWords.sort((a, b) => b.length - a.length)[0] ||
        searchWords[0];

      query = query.ilike("PostTitle", `%${filterWord}%`);

      const { data, error } = await query;
      if (error) throw error;

      const allPosts = data
        ? data.map((row) => this.mapRowToPostSync(row))
        : [];

      const matches: { post: FitGirlPost; score: number }[] = [];

      const extractDigits = (s: string): string[] =>
        (s.match(/\d+/g) || []) as string[];
      const searchDigits = extractDigits(normalizedSearch);

      for (const post of allPosts) {
        if (post.PostTitle.includes("Digest")) continue;

        const normalizedPostTitle = this.normalizeTitle(post.PostTitle);
        const postDigits = extractDigits(normalizedPostTitle);

        let score = 1.0;

        if (searchDigits.length > 0 && postDigits.length > 0) {
          const hasDigitMatch = searchDigits.some((d) =>
            postDigits.includes(d),
          );
          if (!hasDigitMatch) continue;
        }

        let sTitle = normalizedSearch;
        let pTitle = normalizedPostTitle;

        if (sTitle.startsWith("the ")) sTitle = sTitle.substring(4);
        if (pTitle.startsWith("the ")) pTitle = pTitle.substring(4);

        if (pTitle.startsWith(sTitle) || sTitle.startsWith(pTitle)) {
          const longer = pTitle.length > sTitle.length ? pTitle : sTitle;
          const shorter = pTitle.length > sTitle.length ? sTitle : pTitle;
          const remainder = longer.substring(shorter.length).trim();
          const isLikelySame =
            !remainder ||
            /^(v|build|dlc|-|:|edition|collectors|limited|gold|ultimate|deluxe|remastered|remake|definitive|complete|total|goty|game|directors|plus)/i.test(
              remainder,
            );
          score = isLikelySame ? 0.01 : 0.15;

          const wordOverlap =
            sTitle.split(/\s+/).length + (isLikelySame ? 1 : 0);
          score = score / wordOverlap;
        } else {
          const significantSearchWords = searchWords.filter(
            (w) => !GENERIC_WORDS.has(w),
          );
          const postWords = normalizedPostTitle
            .split(/\s+/)
            .filter((w) => w.length > 2 || /\d/.test(w));
          const significantPostWords = postWords.filter(
            (w) => !GENERIC_WORDS.has(w),
          );

          const intersection = significantSearchWords.filter((w) =>
            significantPostWords.includes(w),
          );

          if (significantSearchWords.length > 0) {
            const overlapRatio =
              intersection.length / significantSearchWords.length;
            const strayWords = significantPostWords.filter(
              (w) => !significantSearchWords.includes(w),
            );
            const containsDangerousStray = strayWords.some(
              (w) => !GENERIC_WORDS.has(w) && w.length > 3,
            );

            if (overlapRatio > 0.8 && !containsDangerousStray) {
              score = 0.18;
            } else if (intersection.length === 0) {
              continue;
            } else if (containsDangerousStray) {
              score = 0.5;
            } else if (overlapRatio > 0.5) {
              score = 0.24;
            }
          }

          if (score >= 0.25) {
            if (
              normalizedPostTitle.includes(normalizedSearch) ||
              normalizedSearch.includes(normalizedPostTitle)
            ) {
              const lengthRatio =
                Math.min(normalizedPostTitle.length, normalizedSearch.length) /
                Math.max(normalizedPostTitle.length, normalizedSearch.length);
              if (lengthRatio > 0.6) {
                const baseScore = 1.0 - lengthRatio * 0.9;
                score =
                  score === 0.5 ? Math.max(0.3, baseScore + 0.2) : baseScore;
              }
            } else {
              const distance = this.levenshtein(
                normalizedPostTitle,
                normalizedSearch,
              );
              const baseScore =
                distance /
                Math.max(normalizedPostTitle.length, normalizedSearch.length);
              score =
                score === 0.5 ? Math.max(0.3, baseScore + 0.2) : baseScore;
            }
          }
        }

        if (score < 0.25) {
          matches.push({ post, score });
        }
      }

      matches.sort((a, b) => a.score - b.score);
      return matches.map((m) => m.post);
    } catch (err) {
      console.error("Search failed on Supabase:", err);
      return [];
    }
  }

  async getIdsOlderThan(timestamp: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("PostID")
        .lte("Timestamp", timestamp);

      if (error) throw error;
      return data ? data.map((d) => d.PostID) : [];
    } catch (err) {
      console.error("Error fetching older IDs from Supabase:", err);
      return [];
    }
  }

  levenshtein(s: string, t: string): number {
    if (!s) return t.length;
    if (!t) return s.length;
    const array: number[][] = [];
    for (let i = 0; i <= t.length; i++) array[i] = [i];
    for (let j = 0; j <= s.length; j++) array[0][j] = j;

    for (let i = 1; i <= t.length; i++) {
      for (let j = 1; j <= s.length; j++) {
        array[i][j] =
          t[i - 1] === s[j - 1]
            ? array[i - 1][j - 1]
            : Math.min(array[i - 1][j - 1], array[i][j - 1], array[i - 1][j]) +
              1;
      }
    }
    return array[t.length][s.length];
  }
}

const instance = new FitGirlService();
export default instance;
