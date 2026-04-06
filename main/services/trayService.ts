import { Tray, Menu, nativeImage, app, BrowserWindow } from "electron";
import { getAssetPath } from "../utils";
import { launchGameAction } from "../handlers/games";

let tray: Tray | null = null;

export interface RecentGame {
  name: string;
  exePath: string;
}

export function createTray(mainWindow: BrowserWindow, updateJumpList: () => void): Tray | null {
  try {
    const iconPath = getAssetPath("app_icon.png");
    console.log("[Tray] Loading icon from:", iconPath);
    const icon = nativeImage.createFromPath(iconPath);

    const resizedIcon = icon.resize({ width: 16, height: 16 });

    tray = new Tray(resizedIcon.isEmpty() ? iconPath : resizedIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open FitGirl Repacks Manager",
        click: () => {
          mainWindow.show();
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          (app as any).isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setToolTip("FitGirl Repacks Manager");
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => {
      mainWindow.show();
    });
    return tray;
  } catch (err) {
    console.error("[Tray] Could not create system tray:", err);
    return null;
  }
}

export function updateTrayMenu(mainWindow: BrowserWindow, updateJumpList: () => void, recentGames: RecentGame[] = []): void {
  if (!tray) return;

  const gameItems = recentGames.map((game) => {
    const icon = nativeImage
      .createFromPath(game.exePath)
      .resize({ width: 16, height: 16 });
    return {
      label: `Play ${game.name}`,
      icon: icon.isEmpty() ? undefined : icon,
      click: () => {
        launchGameAction(mainWindow, game.exePath, updateJumpList);
      },
    };
  });

  const template: any[] = [
    {
      label: "Open FitGirl Repacks Manager",
      click: () => {
        mainWindow.show();
      },
    },
    { type: "separator" },
  ];

  if (gameItems.length > 0) {
    template.push({ label: "Recent Games", enabled: false });
    template.push(...gameItems);
    template.push({ type: "separator" });
  }

  template.push({
    label: "Quit",
    click: () => {
      (app as any).isQuitting = true;
      app.quit();
    },
  });

  const contextMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(contextMenu);
}

export function getTray(): Tray | null {
  return tray;
}

const trayService = {
  createTray,
  updateTrayMenu,
  getTray
};

export default trayService;
