import fs from "fs-extra";
import path from "path";

/**
 * Filter for executable files that are likely to be games.
 * Excludes common setup, uninstall, and crash handler files.
 */
const EXCLUDED_KEYWORDS = [
  "unins",
  "setup",
  "install",
  "crashhandler",
  "crashpad",
  "updater",
  "unitycrashhandler",
  "dxsetup",
  "redist",
  "launcher",
  "quicksfv",
  "vcredist",
  "physx",
  "dotnet",
  "vulkan",
  "ds4windows",
];

const GENERIC_LAUNCHERS = ["launcher.exe", "game_launcher.exe", "start.exe"];

export interface DetectedExecutable {
  name: string;
  path: string;
}

export interface DetectedGame {
  detectedName: string;
  executables: DetectedExecutable[];
}

export async function scanForGames(
  baseFolder: string,
): Promise<DetectedGame[]> {
  const games: DetectedGame[] = [];
  if (!(await fs.pathExists(baseFolder))) return [];

  const entries = await fs.readdir(baseFolder, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const folderPath = path.join(baseFolder, entry.name);
      const folderName = entry.name;

      if (
        [
          "eagames",
          "ubisoft",
          "activision",
          "origin games",
          "steamapps",
        ].includes(folderName.toLowerCase())
      ) {
        const subEntries = await fs.readdir(folderPath, {
          withFileTypes: true,
        });
        for (const sub of subEntries) {
          if (sub.isDirectory()) {
            const subPath = path.join(folderPath, sub.name);
            const exes = await findExecutablesRecursively(subPath, 0);
            if (exes.length > 0) {
              games.push({
                detectedName: sub.name,
                executables: exes,
              });
            }
          }
        }
        continue;
      }

      const exes = await findExecutablesRecursively(folderPath, 0);
      if (exes.length > 0) {
        games.push({
          detectedName: folderName,
          executables: exes,
        });
      }
    }
  }

  return games;
}

const ALLOWED_LAUNCHER_KEYWORDS = ["redprelauncher"];

/**
 * Robustly find all executables in a directory and its subdirectories.
 * We go deep to catch nested structures like Binaries/Win64.
 */
async function findExecutablesRecursively(
  dir: string,
  depth: number,
): Promise<DetectedExecutable[]> {
  if (depth > 5) return [];

  const results: DetectedExecutable[] = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const file of list) {
      if (file.isDirectory()) {
        const lowName = file.name.toLowerCase();
        if (
          [
            "_redist",
            "commonredux",
            "dotnet",
            "engine",
            "plugins",
            "resources",
          ].includes(lowName)
        )
          continue;

        const subResults = await findExecutablesRecursively(
          path.join(dir, file.name),
          depth + 1,
        );
        results.push(...subResults);
      } else if (file.isFile() && file.name.toLowerCase().endsWith(".exe")) {
        const lowerName = file.name.toLowerCase();
        const isExcluded =
          (EXCLUDED_KEYWORDS.some((keyword) => lowerName.includes(keyword)) &&
            !ALLOWED_LAUNCHER_KEYWORDS.some((kw) => lowerName.includes(kw))) ||
          GENERIC_LAUNCHERS.includes(lowerName);

        if (!isExcluded) {
          results.push({ name: file.name, path: path.join(dir, file.name) });
        }
      }
    }
  } catch (err) {}
  return results;
}
