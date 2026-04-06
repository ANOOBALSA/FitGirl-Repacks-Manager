import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { app, Notification } from "electron";
import { getMainWindow } from "./windowService";
import { getAssetPath } from "../utils";
import userDataService from "./userDataService";

class NotificationService {
  private supabase: SupabaseClient | null = null;
  private channel: any = null;

  async start() {
    if (this.channel) {
      console.log("[NotificationService] Already subscribed, skipping start.");
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const TABLE_NAME = process.env.NEXT_PUBLIC_SUPABASE_TABLE_NAME || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        "[NotificationService] Supabase credentials missing. Real-time notifications disabled.",
      );
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log(
      `[NotificationService] Subscribing to ${TABLE_NAME} for new repacks...`,
    );

    this.channel = this.supabase
      .channel("repack-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TABLE_NAME },
        (payload: any) => {
          console.log(
            "[NotificationService] NEW REPACK!",
            payload.new.PostTitle,
          );
          this.handleNewRepack(payload.new);
        },
      );

    this.channel.subscribe((status: string, err?: any) => {
      if (status === "SUBSCRIBED") {
        console.log(
          "[NotificationService] Successfully subscribed to Realtime!",
        );
      } else {
        console.error(
          `[NotificationService] Subscription status: ${status}`,
          err || "",
        );
        if (status === "CHANNEL_ERROR") {
          console.error(
            "[NotificationService] Ensure Realtime is enabled for table 'FitData' in: Database -> Replication -> Source -> FitData",
          );
        }
      }
    });
  }

  async stop() {
    if (this.channel) {
      console.log("[NotificationService] Unsubscribing from Realtime...");
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.supabase = null;
  }

  private async handleNewRepack(repack: any) {
    const settings = await userDataService.getData("settings");
    const mode = settings.notificationMode || "all";

    if (mode === "disabled") {
      console.log("[NotificationService] Notifications disabled, skipping.");
      return;
    }

    if (mode === "library") {
      const data = await userDataService.getData();
      const libraryGames = Object.values(data.virtualGames || {});
      const newTitle = this.normalizeTitle(repack.PostTitle);

      const hasMatch = libraryGames.some((game: any) => {
        const libTitle = this.normalizeTitle(game.name || "");
        return (
          libTitle.includes(newTitle) ||
          newTitle.includes(libTitle) ||
          this.levenshtein(libTitle, newTitle) < 3
        );
      });

      if (!hasMatch) {
        console.log(
          `[NotificationService] Repack "${repack.PostTitle}" not in library, skipping.`,
        );
        return;
      }
      console.log(
        `[NotificationService] Match found in library for "${repack.PostTitle}"!`,
      );
    }

    const title = repack.PostTitle || "New Repack Added!";

    if (Notification.isSupported()) {
      const notification = new Notification({
        icon: getAssetPath("app_icon.png"),
        urgency: "critical",
        title: "New FitGirl Repack!",
        body: title,
        silent: false,
      });

      notification.on("click", () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();

          mainWindow.webContents.send("navigate-to-repack", repack);
        }
      });

      notification.show();
    }

    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send("new-repack-notification", repack);
    }
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private levenshtein(s: string, t: string): number {
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

export const notificationService = new NotificationService();
export default notificationService;
