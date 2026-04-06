import { app, BrowserWindow } from "electron";
import path from "path";
import userData from "./userDataService";
import trayService, { RecentGame } from "./trayService";

export async function updateJumpList(mainWindow: BrowserWindow): Promise<void> {
  if (process.platform !== "win32") return;
  try {
    const data = await userData.getData();
    const lastPlayed =
      (data.lastPlayedTimestamps as Record<string, number>) || {};
    const gamePaths = (data.gamePaths as Record<string, string>) || {};

    const sortedIds = Object.keys(lastPlayed).sort(
      (a, b) => lastPlayed[b] - lastPlayed[a],
    );

    const recentGames: RecentGame[] = sortedIds
      .filter((id) => !!gamePaths[id])
      .slice(0, 7)
      .map((id) => ({
        exePath: gamePaths[id],
        name: path.basename(gamePaths[id], ".exe"),
      }));

    trayService.updateTrayMenu(
      mainWindow,
      () => updateJumpList(mainWindow),
      recentGames,
    );

    const items = recentGames.map((game) => {
      return {
        type: "task" as const,
        title: `Play ${game.name}`,
        program: game.exePath,
        iconPath: game.exePath,
        iconIndex: 0,
        description: `Launch ${game.name}`,
      };
    });

    app.setJumpList([
      {
        type: "custom",
        name: "Recent Games",
        items: items,
      },
    ]);
  } catch (err) {
    console.error("[JumpList] Error:", err);
  }
}
