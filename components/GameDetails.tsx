"use client";

import {
  Box,
  Container,
  Image,
  Text,
  Title,
  Group,
  Badge,
  Stack,
  Button,
  SimpleGrid,
  AspectRatio,
  Divider,
  Card,
  Loader,
  Center,
  useMantineTheme,
  Menu,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMediaQuery } from "@mantine/hooks";
import { useState, useEffect } from "react";
import { Carousel } from "@mantine/carousel";
import {
  IconArrowLeft,
  IconHeart,
  IconDeviceGamepad2,
  IconCheck,
  IconBookmark,
  IconDownload,
  IconExternalLink,
  IconTrophy,
  IconSettings,
  IconRefresh,
  IconCalendar,
  IconUsers,
  IconStar,
  IconPinned,
  IconChevronDown,
  IconFileText,
} from "@tabler/icons-react";
import { Switch, ActionIcon, Tooltip, rem } from "@mantine/core";
import { PlatformIcons } from "./PlatformIcons";
import { Game } from "../lib/igdb";
import { useUserData } from "../lib/useUserData";
import { FileSelectionModal } from "./FileSelectionModal";
import { DownloadOptionsModal } from "./DownloadOptionsModal";
import {
  IconFolderOpen,
  IconTools,
  IconPackage,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconFileZip,
  IconFolderSearch,
  IconArchive,
  IconMap,
  IconX,
  IconLink,
  IconFolder,
} from "@tabler/icons-react";
import { ScrollArea } from "@mantine/core";
import { MapViewer } from "./MapViewer";
import fitgirlService, { FitGirlPost } from "../lib/fitgirl";
import { motion, AnimatePresence } from "motion/react";

interface GameDetailsProps {
  game: Game;
  onBack: () => void;
  onStatusChange: (gameId: number, status: string) => void;
  currentStatuses?: string[];
  isEmbedded?: boolean;
}

export function GameDetails({
  game,
  onBack,
  onStatusChange,
  currentStatuses = [],
  isEmbedded = false,
}: GameDetailsProps) {
  const safeStatuses = (
    Array.isArray(currentStatuses) ? currentStatuses : []
  ).filter((s) => typeof s === "string" && s.length > 1);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.md})`);
  const [repacks, setRepacks] = useState<FitGirlPost[]>([]);
  const [isUpdateOpen, setIsUpdateOpen] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [repackLoading, setRepackLoading] = useState(false);
  const [rescrapeLoading, setRescrapeLoading] = useState(false);
  const [individualRescrapeLoading, setIndividualRescrapeLoading] = useState<
    Set<string>
  >(new Set());

  const handleRescrapeSingle = async (url: string) => {
    setIndividualRescrapeLoading((prev) => new Set(prev).add(url));
    try {
      const updated = await fitgirlService.scrapeSinglePost(url);
      if (updated) {
        setRepacks((prev) =>
          prev.map((r) => (r.PostLink === url ? updated : r)),
        );
      }
    } catch (e) {
      console.error("Single rescrape error:", e);
    } finally {
      setIndividualRescrapeLoading((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  const handleRescrapeAll = async () => {
    setRescrapeLoading(true);
    try {
      const results = await Promise.all(
        repacks.map(async (r) => {
          if (!r.PostLink) return r;
          try {
            const updated = await fitgirlService.scrapeSinglePost(r.PostLink);
            return updated || r;
          } catch (e) {
            return r;
          }
        }),
      );
      setRepacks(results);
    } catch (error) {
      console.error("Rescrape error:", error);
    } finally {
      setRescrapeLoading(false);
    }
  };
  const { userData, updateKey, loading: userDataLoading } = useUserData();

  useEffect(() => {
    const searchRepack = async () => {
      setRepackLoading(true);
      try {
        const result = await fitgirlService.searchForRepack(game.name);
        const repackList = Array.isArray(result)
          ? result
          : result
            ? [result]
            : [];
        setRepacks(repackList);
      } catch (error) {
        console.error("Repack search error:", error);
      } finally {
        setRepackLoading(false);
      }
    };

    if (game.name && !userDataLoading) {
      searchRepack();
    }
  }, [game.name, userDataLoading]);

  const sortedRepacks = [...repacks];

  const screenshots =
    game.screenshots?.map((s) => s.url.replace("t_thumb", "t_1080p")) || [];
  const videos = game.videos || [];

  const heroImage =
    screenshots[0] || game.cover?.url?.replace("t_thumb", "t_1080p") || "";

  const statusTimestamps = userData?.statusTimestamps || {};
  const virtualGamesMetadata = userData?.virtualGames || {};

  const [downloadProgress, setDownloadProgress] = useState<any>(null);
  const [fileModalOpened, setFileModalOpened] = useState(false);
  const [optionsModalOpened, setOptionsModalOpened] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedRepack, setSelectedRepack] = useState<FitGirlPost | null>(
    null,
  );
  const [partSizes, setPartSizes] = useState<Record<string, number>>({});
  const [installerExists, setInstallerExists] = useState<boolean | null>(null);
  const [folderFiles, setFolderFiles] = useState<
    { name: string; isDir: boolean; size: number }[] | null
  >(null);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [unpacking, setUnpacking] = useState(false);
  const [deletingRars, setDeletingRars] = useState(false);
  const [deletingSetup, setDeletingSetup] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [silentInstalling, setSilentInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [mapLink, setMapLink] = useState<string | null>(null);
  const [mapViewerOpened, setMapViewerOpened] = useState(false);

  useEffect(() => {
    const fetchMap = async () => {
      if (game.name) {
        const link = await (window as any).electron.mapgenieSearch(game.name);
        setMapLink(link);
      }
    };
    fetchMap();
  }, [game.name]);

  useEffect(() => {
    const electron = (window as any).electron;
    let unsubscribe: (() => void) | undefined;
    if (electron?.onDownloadProgress) {
      unsubscribe = electron.onDownloadProgress((progress: any) => {
        if (progress.gameId === String(game.id)) {
          if (progress.status === "deleted") {
            setDownloadProgress(null);
          } else {
            setDownloadProgress(progress);
          }
        }
      });
    }

    const checkDownloads = async () => {
      const active = await electron.getActiveDownloads();
      if (active[game.id]) {
        setDownloadProgress(active[game.id]);
      }
    };
    checkDownloads();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [game.id]);

  const downloadFolder =
    downloadProgress?.folder || userData?.downloadedGames?.[game.id] || null;
  const hasRars = (folderFiles || []).some((f) =>
    f.name.toLowerCase().endsWith(".rar"),
  );

  useEffect(() => {
    const status = downloadProgress?.status;
    if (!downloadFolder) return;

    if (downloadProgress && status !== "completed" && status !== "installed")
      return;

    const electron = (window as any).electron;
    electron
      .checkInstallerExists(downloadFolder)
      .then((r: any) => setInstallerExists(r.exists));
    electron.listDownloadFiles(downloadFolder).then((r: any) => {
      if (r.success) setFolderFiles(r.files);
    });
  }, [downloadFolder, downloadProgress?.status]);

  const handleDownloadClick = async (repack: FitGirlPost) => {
    setSelectedRepack(repack);
    setOptionsModalOpened(true);
  };

  const handleConfirmOptions = async (
    type: "direct" | "torrent",
    providerId: string,
  ) => {
    setOptionsModalOpened(false);

    if (!selectedRepack) return;

    if (type === "torrent") {
      const t = selectedRepack.TorrentLinks.find(
        (l: any) => l.Source === providerId,
      );
      if (t) (window as any).electron.openExternal(t.Magnet || t.ExternalLink);
      return;
    }

    if (type === "direct") {
      const d = selectedRepack.DirectLinks.find(
        (l: any) => l.Hoster === providerId,
      );
      if (!d) return;

      if (providerId.includes("FuckingFast")) {
        setSelectedProvider(providerId);
        setFileModalOpened(true);

        const mainLinks = d.Links.Main || [];
        const optionalLinks = d.Links.Optional || [];
        const selectiveLinks = d.Links.Selective || [];
        const isEnglish = (url: string) =>
          url.toLowerCase().includes("english");
        const initialLinks = [
          ...mainLinks,
          ...optionalLinks.filter(isEnglish),
          ...selectiveLinks.filter(isEnglish),
        ];

        setPartSizes({});
        try {
          const results = await (window as any).electron.validateLinks(
            initialLinks,
          );
          const sizeMap: Record<string, number> = {};
          results.forEach((r: any) => {
            sizeMap[r.url] = r.size || 0;
          });
          setPartSizes(sizeMap);
        } catch (err: any) {
          if (err.message === "RATE_LIMITED") {
            notifications.show({
              title: "Rate Limited",
              message:
                "FuckingFast is rate limiting your requests. Please wait a few minutes before trying again.",
              color: "red",
              autoClose: 10000,
            });
          }
          console.error("Initial link validation failed:", err);
        }
      } else {
        const links = d.Links.Main || Object.values(d.Links)[0];
        if (links?.[0]) (window as any).electron.openExternal(links[0]);
      }
    }
  };

  const handleRescanFile = async (url: string) => {
    try {
      const results = await (window as any).electron.validateLinks([url]);
      if (results && results.length > 0) {
        setPartSizes((prev) => ({
          ...prev,
          [url]: results[0].size || 0,
        }));
      }
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        notifications.show({
          title: "Rate Limited",
          message:
            "FuckingFast is rate limiting your requests. Please wait a few minutes before trying again.",
          color: "red",
          autoClose: 10000,
        });
      }
      console.error("Rescan failed for url:", url, err);
    }
  };

  const handleRescanAll = async () => {
    if (!selectedRepack || !selectedProvider) return;

    const d = selectedRepack.DirectLinks.find(
      (l: any) => l.Hoster === selectedProvider,
    );
    if (!d) return;

    const mainLinks = d.Links.Main || [];
    const optionalLinks = d.Links.Optional || [];
    const selectiveLinks = d.Links.Selective || [];
    const allLinks = [...mainLinks, ...optionalLinks, ...selectiveLinks];

    const deadLinks = allLinks.filter((url) => !partSizes[url]);

    if (deadLinks.length === 0) return;

    try {
      const results = await (window as any).electron.validateLinks(deadLinks);
      const newSizes: Record<string, number> = {};
      results.forEach((r: any) => {
        newSizes[r.url] = r.size || 0;
      });
      setPartSizes((prev) => ({ ...prev, ...newSizes }));
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        notifications.show({
          title: "Rate Limited",
          message:
            "FuckingFast is rate limiting your requests. Please wait a few minutes before trying again.",
          color: "red",
          autoClose: 10000,
        });
      }
      console.error("Rescan all failed:", err);
    }
  };

  const handleUnpackRars = async () => {
    if (!downloadFolder) return;
    setUnpacking(true);
    try {
      const r = await (window as any).electron.unpackDownloadRars(
        String(game.id),
      );
      if (!r.success) alert(`Unpack failed: ${r.error}`);
      else {
        const r2 = await (window as any).electron.listDownloadFiles(
          downloadFolder,
        );
        if (r2.success) setFolderFiles(r2.files);
        const r3 = await (window as any).electron.checkInstallerExists(
          downloadFolder,
        );
        setInstallerExists(r3.exists);
      }
    } finally {
      setUnpacking(false);
    }
  };

  const handleDeleteRars = async () => {
    if (
      !downloadFolder ||
      !confirm("Delete all RAR files from the download directory?")
    )
      return;
    setDeletingRars(true);
    try {
      await (window as any).electron.deleteDownloadRars(downloadFolder);
      const r = await (window as any).electron.listDownloadFiles(
        downloadFolder,
      );
      if (r.success) setFolderFiles(r.files);
    } finally {
      setDeletingRars(false);
    }
  };

  const handleDeleteSetup = async () => {
    if (
      !downloadFolder ||
      !confirm(
        "Are you sure you want to delete the entire download folder for this game? This will remove all setup files and installers.",
      )
    )
      return;
    setDeletingSetup(true);
    try {
      const res = await (window as any).electron.deleteInstallFiles({
        gameId: String(game.id),
        folderPath: downloadFolder,
      });
      if (res.success) {
        setFolderFiles([]);
        setInstallerExists(false);
        if (safeStatuses.includes("downloaded")) {
          handleStatusChangeWithTimestamp(game.id, "downloaded");
        }
      }
    } finally {
      setDeletingSetup(false);
    }
  };

  const handleUninstall = async () => {
    const exePath = userData?.gamePaths?.[game.id];
    if (!exePath) return;
    if (
      !confirm(
        "Are you sure you want to uninstall this game? This will open the game's uninstaller.",
      )
    )
      return;

    setUninstalling(true);
    try {
      const res = await (window as any).electron.uninstallGame(exePath);
      if (res.success) {
        const updatedPaths = { ...userData?.gamePaths };
        delete updatedPaths[game.id];
        await updateKey("gamePaths", updatedPaths);

        const updatedDownloads = { ...userData?.downloadedGames };
        delete updatedDownloads[game.id];
        await updateKey("downloadedGames", updatedDownloads);

        const updatedUserGames = { ...userData?.userGames };
        if (updatedUserGames[game.id]) {
          updatedUserGames[game.id] = updatedUserGames[game.id].filter(
            (s: string) => s !== "downloaded",
          );
          if (updatedUserGames[game.id].length === 0) {
            delete updatedUserGames[game.id];
          }
        }
        await updateKey("userGames", updatedUserGames);
      } else {
        alert("Uninstall failed: " + res.error);
      }
    } catch (err: any) {
      alert("Uninstall failed: " + err.message);
    } finally {
      setUninstalling(false);
    }
  };

  const handleConfirmDownload = async (additionalFiles: string[]) => {
    if (!selectedRepack || !selectedProvider) return;

    const ffHoster = selectedRepack.DirectLinks.find(
      (d) => d.Hoster === selectedProvider,
    );
    if (!ffHoster) return;

    const mainLinks = ffHoster.Links.Main || [];
    const optionalLinks = ffHoster.Links.Optional || [];
    const selectiveLinks = ffHoster.Links.Selective || [];

    const allLinks = [...mainLinks, ...optionalLinks, ...selectiveLinks];
    const selectedLinksMask = allLinks.map(
      (link) => mainLinks.includes(link) || additionalFiles.includes(link),
    );

    const selectedLinks = allLinks.filter((_, i) => selectedLinksMask[i]);
    const validationResults = await (window as any).electron.validateLinks(
      selectedLinks,
    );
    const brokenLinks = validationResults.filter((r: any) => !r.ok);

    if (brokenLinks.length > 0) {
      if (
        !confirm(
          `Warning: ${brokenLinks.length} file(s) are currently unreachable. Some mirrors might be down. Do you still want to proceed with the available parts?`,
        )
      ) {
        return;
      }
    }

    const linkMetadata = allLinks.map((link) => ({
      url: link,
      category: mainLinks.includes(link)
        ? "Main"
        : optionalLinks.includes(link)
          ? "Optional"
          : "Selective",
    }));

    await (window as any).electron.startDownload({
      gameId: String(game.id),
      provider: selectedProvider,
      links: allLinks,
      selectedLinks: selectedLinksMask,
      partSizes: partSizes,
      repackSize: selectedRepack.PostFileRepackSize,
      linkMetadata: linkMetadata,
    });

    setFileModalOpened(false);
  };

  const handleInstall = async () => {
    const folder = userData?.downloadedGames?.[game.id] || downloadFolder;
    if (folder) {
      setInstalling(true);
      try {
        const res = await (window as any).electron.launchInstaller(folder, {
          silent: false,
        });
        if (res?.newExePath) {
          const updatedPaths = {
            ...userData?.gamePaths,
            [game.id]: res.newExePath,
          };
          await updateKey("gamePaths", updatedPaths);
          handleStatusChangeWithTimestamp(game.id, "playing");
        }
      } catch (err: any) {
        alert("Failed to launch installer: " + err.message);
      } finally {
        setInstalling(false);
      }
    }
  };

  const handlePause = async () => {
    await (window as any).electron.pauseDownload(String(game.id));
  };

  const handleResume = async () => {
    await (window as any).electron.resumeDownload(String(game.id));
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this download?")) {
      await (window as any).electron.deleteDownload(String(game.id), true);
      setDownloadProgress(null);
    }
  };

  const isDownloaded = !!userData?.downloadedGames?.[game.id];
  const isDownloadingOrPaused =
    !!downloadProgress &&
    downloadProgress.status !== "completed" &&
    downloadProgress.status !== "error";
  const isPaused = downloadProgress?.status === "paused";

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec) return "0 B/s";
    return formatSize(bytesPerSec) + "/s";
  };

  const handleStatusChangeWithTimestamp = async (
    gameId: number,
    status: string,
  ) => {
    onStatusChange(gameId, status);
  };

  const StatusButton = ({ status, active, icon: Icon, label, color }: any) => {
    const isProtectedDownloaded =
      status === "downloaded" && active && installerExists;

    return (
      <Button
        variant={active ? "filled" : "light"}
        color={active ? color : "gray"}
        onClick={() => {
          if (isProtectedDownloaded) {
            alert(
              "Cannot remove 'Downloaded' status while installer files still exist. Please delete setup files first if you wish to remove this status.",
            );
            return;
          }
          handleStatusChangeWithTimestamp(game.id, status);
        }}
        leftSection={<Icon size={18} />}
        flex={1}
        disabled={isProtectedDownloaded}
        style={isProtectedDownloaded ? { cursor: "not-allowed" } : {}}
      >
        {label}
      </Button>
    );
  };

  const gamePath = userData?.gamePaths?.[game.id];
  const [isGameRunning, setIsGameRunning] = useState(false);

  useEffect(() => {
    const checkActiveGame = async () => {
      const active = await (window as any).electron.getActiveGame();
      setIsGameRunning(active !== null);
    };
    checkActiveGame();

    const electron = (window as any).electron;
    let unsubscribe: (() => void) | undefined;
    if (electron?.onGameStatusUpdated) {
      unsubscribe = electron.onGameStatusUpdated(
        (status: { running: boolean }) => {
          setIsGameRunning(status.running);
        },
      );
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLaunch = async () => {
    if (gamePath && !isGameRunning) {
      await (window as any).electron.launchGame(gamePath);
    }
  };

  return (
    <Box>
      {/* Main Content Layout */}
      <Container size="xl" pt="md" pos="relative" style={{ zIndex: 10 }}>
        {!isEmbedded && (
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onBack}
            mb="lg"
            c="white"
            w="fit-content"
            p={0}
            styles={{
              root: {
                "&:hover": {
                  background: "none",
                  color: "rgba(255,255,255,0.7)",
                },
              },
            }}
          >
            Back to Library
          </Button>
        )}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "300px 1fr" : "1fr",
            gap: 40,
            alignItems: "start",
          }}
        >
          {/* Left Column: Cover Image & Quick Info */}
          <Stack gap="xl">
            <Image
              src={game.cover?.url?.replace("t_thumb", "t_cover_big")}
              radius="lg"
              alt={game.name}
              w="100%"
              style={{
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </Stack>

          {/* Right Column: Title, Actions & Detailed Content */}
          <Stack gap={40}>
            {/* Header / Title Area */}
            <Box>
              <Title
                order={1}
                size={54}
                c="white"
                style={{
                  lineHeight: 1.1,
                  textShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {game.name}
              </Title>
              <Group gap="lg" mt="md" wrap="wrap">
                {game.first_release_date && (
                  <Group gap={6}>
                    <IconCalendar size={18} color="rgba(255,255,255,0.6)" />
                    <Text c="white" opacity={0.8} fw={600} size="lg">
                      {new Date(game.first_release_date! * 1000).getFullYear()}
                    </Text>
                  </Group>
                )}
                {game.total_rating && (
                  <Group gap={6}>
                    <IconStar size={18} color="var(--mantine-color-yellow-5)" />
                    <Text c="yellow.5" fw={700} size="lg">
                      {Math.round(game.total_rating)}% Rating
                    </Text>
                  </Group>
                )}
              </Group>

              {/* Relocated Game Info */}
              <Stack gap="md" mt="xl">
                <Group gap="xl" wrap="wrap">
                  {userData?.playTime?.[game.id] && (
                    <Group gap={8}>
                      <Text c="dimmed" size="sm" fw={700} tt="uppercase">
                        Playtime:
                      </Text>
                      <Text fw={800} c="blue.4">
                        {(userData?.playTime?.[game.id]! / 60).toFixed(1)}h
                      </Text>
                    </Group>
                  )}

                  <Group gap={8}>
                    <Text c="dimmed" size="sm" fw={700} tt="uppercase">
                      Genres:
                    </Text>
                    <Group gap={6}>
                      {game.genres?.map((g) => (
                        <Badge
                          key={g.name}
                          variant="dot"
                          size="sm"
                          color="gray"
                        >
                          {g.name}
                        </Badge>
                      ))}
                    </Group>
                  </Group>

                  <Group gap={8}>
                    <Text c="dimmed" size="sm" fw={700} tt="uppercase">
                      Platforms:
                    </Text>
                    <PlatformIcons
                      platforms={game.platforms}
                      size={18}
                      limit={10}
                    />
                  </Group>
                </Group>
              </Stack>
            </Box>

            {/* Actions & Game Management (Now Stacked Under Title) */}
            <Card
              withBorder
              radius="lg"
              p="xl"
              style={{
                backgroundColor: "rgba(26, 27, 30, 0.6)",
                backdropFilter: "blur(20px)",
                borderLeft: "4px solid var(--mantine-color-blue-6)",
              }}
            >
              <Stack gap="xl">
                <Group
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  gap="md"
                >
                  <Badge size="xl" color="blue" variant="filled">
                    {safeStatuses.length > 0
                      ? safeStatuses
                          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                          .join(" ")
                      : "Not in Library"}
                  </Badge>

                  <Group gap="sm">
                    <StatusButton
                      status="favorite"
                      active={safeStatuses.includes("favorite")}
                      icon={IconHeart}
                      label="Favorite"
                      color="red"
                    />
                    {gamePath && (
                      <Button
                        size="md"
                        color="green"
                        leftSection={<IconDeviceGamepad2 size={20} />}
                        onClick={handleLaunch}
                        variant="filled"
                        disabled={isGameRunning}
                        styles={{
                          root: {
                            boxShadow: "0 4px 15px rgba(64, 192, 87, 0.4)",
                          },
                        }}
                      >
                        {isGameRunning ? "Running..." : "Play Now"}
                      </Button>
                    )}
                    {mapLink && (
                      <Button
                        size="md"
                        color="grape"
                        leftSection={<IconMap size={20} />}
                        onClick={() => setMapViewerOpened(true)}
                        variant="filled"
                        styles={{
                          root: {
                            boxShadow: "0 4px 15px rgba(156, 54, 181, 0.4)",
                          },
                        }}
                      >
                        Interactive Map
                      </Button>
                    )}
                  </Group>
                </Group>

                <Divider color="dark.4" />

                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                  <StatusButton
                    status="playing"
                    active={safeStatuses.includes("playing")}
                    icon={IconDeviceGamepad2}
                    label="Playing"
                    color="blue"
                  />
                  <StatusButton
                    status="completed"
                    active={safeStatuses.includes("completed")}
                    icon={IconCheck}
                    label="Done"
                    color="green"
                  />
                  <StatusButton
                    status="wishlist"
                    active={safeStatuses.includes("wishlist")}
                    icon={IconBookmark}
                    label="Wishlist"
                    color="orange"
                  />
                  <StatusButton
                    status="downloaded"
                    active={safeStatuses.includes("downloaded") || isDownloaded}
                    icon={IconDownload}
                    label={isDownloaded ? "Downloaded" : "Ready"}
                    color="cyan"
                  />
                </SimpleGrid>

                {/* Download / Install / Progress UI */}
                {!gamePath && (
                  <Box>
                    {isDownloadingOrPaused ? (
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Text
                              size="sm"
                              fw={700}
                              c={isPaused ? "gray.4" : "pink.4"}
                            >
                              {isPaused ? "Paused" : "Downloading"}:{" "}
                              {downloadProgress.progress}%
                            </Text>
                            <Group gap={4}>
                              <ActionIcon
                                color={isPaused ? "green" : "yellow"}
                                onClick={isPaused ? handleResume : handlePause}
                                size="sm"
                                variant="light"
                              >
                                {isPaused ? (
                                  <IconPlayerPlay size={14} />
                                ) : (
                                  <IconPlayerPause size={14} />
                                )}
                              </ActionIcon>
                              <ActionIcon
                                color="red"
                                onClick={handleDelete}
                                size="sm"
                                variant="light"
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Group>
                          <Text size="xs" c="dimmed">
                            Part {downloadProgress.currentPart} of{" "}
                            {downloadProgress.totalParts}
                          </Text>
                        </Group>
                        <Box
                          h={10}
                          style={{
                            backgroundColor: "rgba(255,255,255,0.1)",
                            borderRadius: 5,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            h="100%"
                            w={`${downloadProgress.progress}%`}
                            style={{
                              backgroundColor: isPaused
                                ? "var(--mantine-color-gray-6)"
                                : "var(--mantine-color-pink-6)",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </Box>
                        <Group justify="space-between" mt={2}>
                          <Text size="xs" color="dimmed" fs="italic">
                            {downloadProgress.status}
                          </Text>
                          {downloadProgress.totalSize > 0 && (
                            <Text size="xs" color="dimmed">
                              {formatSize(downloadProgress.downloadedSize)} /{" "}
                              {formatSize(downloadProgress.totalSize)}
                              {!isPaused &&
                                ` • ${formatSpeed(downloadProgress.speed)}`}
                            </Text>
                          )}
                        </Group>
                      </Stack>
                    ) : isDownloaded ? (
                      <Stack gap="xs">
                        <Group grow gap="xs">
                          <Button
                            size="lg"
                            color="orange"
                            leftSection={<IconTools size={24} />}
                            loading={installing}
                            onClick={handleInstall}
                            disabled={installerExists === false}
                            styles={{ root: { fontSize: 18 } }}
                          >
                            {installerExists === false
                              ? "No Installer Found"
                              : "Launch Installer"}
                          </Button>
                          <Button
                            size="lg"
                            color="pink"
                            leftSection={<IconTools size={24} />}
                            loading={silentInstalling}
                            onClick={async () => {
                              if (!downloadFolder) return;
                              setSilentInstalling(true);
                              try {
                                const res = await (
                                  window as any
                                ).electron.launchInstaller(downloadFolder, {
                                  silent: true,
                                });
                                if (res?.newExePath) {
                                  const updatedPaths = {
                                    ...userData?.gamePaths,
                                    [game.id]: res.newExePath,
                                  };
                                  await updateKey("gamePaths", updatedPaths);
                                  handleStatusChangeWithTimestamp(
                                    game.id,
                                    "playing",
                                  );
                                } else {
                                  alert(
                                    `Silent install started! It will be installed to your default installation folder.`,
                                  );
                                }
                              } catch (e: any) {
                                alert("Install failed: " + e.message);
                              } finally {
                                setSilentInstalling(false);
                              }
                            }}
                            disabled={installerExists === false}
                            styles={{ root: { fontSize: 18 } }}
                          >
                            Silent Install
                          </Button>
                        </Group>

                        <Group wrap="nowrap" gap="xs">
                          <Button
                            variant="light"
                            color="cyan"
                            flex={1}
                            leftSection={<IconFolderOpen size={18} />}
                            onClick={async () => {
                              const path = await (
                                window as any
                              ).electron.selectFolder();
                              if (path) {
                                const updatedDownloads = {
                                  ...userData?.downloadedGames,
                                };
                                updatedDownloads[game.id] = path;
                                await updateKey(
                                  "downloadedGames",
                                  updatedDownloads,
                                );
                              }
                            }}
                          >
                            Edit Folder Path
                          </Button>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="lg"
                            radius="md"
                            title="Open Folder in Explorer"
                            onClick={async () => {
                              if (downloadFolder) {
                                await (window as any).electron.openPath(
                                  downloadFolder,
                                );
                              }
                            }}
                          >
                            <IconFolder size={18} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="lg"
                            radius="md"
                            title="Remove Saved Folder Path Only"
                            onClick={async () => {
                              if (
                                confirm(
                                  "Remove the saved folder path for this game? This will also remove the 'Downloaded' status if present.",
                                )
                              ) {
                                const updatedDownloads = {
                                  ...userData?.downloadedGames,
                                };
                                delete updatedDownloads[game.id];
                                await updateKey(
                                  "downloadedGames",
                                  updatedDownloads,
                                );

                                const updatedUserGames = {
                                  ...userData?.userGames,
                                };
                                if (updatedUserGames[game.id]) {
                                  updatedUserGames[game.id] = updatedUserGames[
                                    game.id
                                  ].filter((s: string) => s !== "downloaded");
                                  if (updatedUserGames[game.id].length === 0) {
                                    delete updatedUserGames[game.id];
                                  }
                                }
                                await updateKey("userGames", updatedUserGames);
                              }
                            }}
                          >
                            <IconX size={18} />
                          </ActionIcon>
                        </Group>

                        <Card
                          withBorder
                          radius="md"
                          p="sm"
                          bg="rgba(0,0,0,0.3)"
                        >
                          <Stack gap="xs">
                            <Group justify="space-between" wrap="nowrap">
                              <Text size="sm" fw={700} c="dimmed">
                                Download Files
                              </Text>
                              <Button
                                size="compact-xs"
                                variant="subtle"
                                color="blue"
                                leftSection={<IconFolderSearch size={14} />}
                                onClick={() => {
                                  setFilesExpanded((v) => !v);
                                  if (!filesExpanded && downloadFolder) {
                                    (window as any).electron
                                      .listDownloadFiles(downloadFolder)
                                      .then((r: any) => {
                                        if (r.success) setFolderFiles(r.files);
                                      });
                                  }
                                }}
                              >
                                {filesExpanded ? "Hide" : "View Files"}
                              </Button>
                            </Group>

                            {filesExpanded && (
                              <ScrollArea h={150} pr="xs">
                                <Stack gap={2}>
                                  {(folderFiles || []).length === 0 ? (
                                    <Text size="xs" c="dimmed" ta="center">
                                      No files found
                                    </Text>
                                  ) : (
                                    (folderFiles || []).map((f) => {
                                      const fmt = (b: number) => {
                                        if (!b) return "";
                                        const k = 1024,
                                          s = ["B", "KB", "MB", "GB"];
                                        const i = Math.floor(
                                          Math.log(b) / Math.log(k),
                                        );
                                        return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${s[i]}`;
                                      };
                                      const isRar = f.name
                                        .toLowerCase()
                                        .endsWith(".rar");
                                      const isSetupFile =
                                        f.name
                                          .toLowerCase()
                                          .startsWith("setup") &&
                                        f.name.toLowerCase().endsWith(".exe");
                                      return (
                                        <Group
                                          key={f.name}
                                          gap="xs"
                                          wrap="nowrap"
                                        >
                                          <Text
                                            size="xs"
                                            style={{ flex: 1 }}
                                            truncate
                                            c={
                                              isRar
                                                ? "orange"
                                                : isSetupFile
                                                  ? "yellow"
                                                  : "white"
                                            }
                                          >
                                            {f.isDir ? "📁" : "📄"} {f.name}
                                          </Text>
                                          {!f.isDir && (
                                            <Text size="xs" c="dimmed">
                                              {fmt(f.size)}
                                            </Text>
                                          )}
                                        </Group>
                                      );
                                    })
                                  )}
                                </Stack>
                              </ScrollArea>
                            )}

                            <Divider color="rgba(255,255,255,0.05)" />

                            <Group gap="xs" grow>
                              <Button
                                size="xs"
                                variant="light"
                                color="blue"
                                leftSection={<IconFileZip size={14} />}
                                disabled={!hasRars}
                                loading={unpacking}
                                onClick={handleUnpackRars}
                              >
                                Unzip RARs
                              </Button>
                              <Button
                                size="xs"
                                variant="light"
                                color="orange"
                                leftSection={<IconArchive size={14} />}
                                disabled={!hasRars}
                                loading={deletingRars}
                                onClick={handleDeleteRars}
                              >
                                Delete RARs
                              </Button>
                              <Button
                                size="xs"
                                variant="light"
                                color="red"
                                leftSection={<IconTrash size={14} />}
                                loading={deletingSetup}
                                onClick={handleDeleteSetup}
                                disabled={!downloadFolder}
                              >
                                Delete Setup
                              </Button>
                            </Group>
                          </Stack>
                        </Card>
                      </Stack>
                    ) : (
                      <Card
                        withBorder
                        radius="md"
                        p="md"
                        bg="rgba(0,0,0,0.2)"
                        style={{ borderStyle: "dashed" }}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={700} c="dimmed" ta="center">
                            Already have the game files?
                          </Text>
                          <Group grow gap="sm">
                            <Button
                              variant="light"
                              color="blue"
                              leftSection={<IconLink size={18} />}
                              onClick={async () => {
                                const path = await (
                                  window as any
                                ).electron.selectFile(
                                  "Select Game Executable",
                                  [
                                    {
                                      name: "Executables",
                                      extensions: ["exe"],
                                    },
                                  ],
                                );
                                if (path) {
                                  const updatedPaths = {
                                    ...userData?.gamePaths,
                                  };
                                  updatedPaths[game.id] = path;
                                  await updateKey("gamePaths", updatedPaths);
                                  if (!safeStatuses.includes("playing")) {
                                    handleStatusChangeWithTimestamp(
                                      game.id,
                                      "playing",
                                    );
                                  }
                                }
                              }}
                            >
                              Link Executable
                            </Button>
                            <Button
                              variant="light"
                              color="cyan"
                              leftSection={<IconFolderSearch size={18} />}
                              onClick={async () => {
                                const path = await (
                                  window as any
                                ).electron.selectFolder();
                                if (path) {
                                  const updatedDownloads = {
                                    ...userData?.downloadedGames,
                                  };
                                  updatedDownloads[game.id] = path;
                                  await updateKey(
                                    "downloadedGames",
                                    updatedDownloads,
                                  );
                                  if (!safeStatuses.includes("downloaded")) {
                                    handleStatusChangeWithTimestamp(
                                      game.id,
                                      "downloaded",
                                    );
                                  }
                                }
                              }}
                            >
                              Link Setup Folder
                            </Button>
                          </Group>
                        </Stack>
                      </Card>
                    )}
                  </Box>
                )}

                {gamePath && (
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Group wrap="nowrap" gap="xs">
                      <Button
                        variant="light"
                        color="green"
                        flex={1}
                        leftSection={<IconSettings size={18} />}
                        onClick={async () => {
                          const path = await (
                            window as any
                          ).electron.selectFile("Select Game Executable", [
                            { name: "Executables", extensions: ["exe"] },
                          ]);
                          if (path) {
                            const updatedPaths = { ...userData?.gamePaths };
                            updatedPaths[game.id] = path;
                            await updateKey("gamePaths", updatedPaths);
                          }
                        }}
                      >
                        Edit Launch Path
                      </Button>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        size="lg"
                        radius="md"
                        title="Open Game Folder in Explorer"
                        onClick={async () => {
                          if (gamePath) {
                            const dir = gamePath.substring(
                              0,
                              gamePath.lastIndexOf("\\"),
                            );
                            await (window as any).electron.openPath(dir);
                          }
                        }}
                      >
                        <IconFolder size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="lg"
                        radius="md"
                        title="Remove Launch Path Only"
                        onClick={async () => {
                          if (
                            confirm(
                              "Remove the saved launch path for this game?",
                            )
                          ) {
                            const updatedPaths = { ...userData?.gamePaths };
                            delete updatedPaths[game.id];
                            await updateKey("gamePaths", updatedPaths);
                          }
                        }}
                      >
                        <IconX size={18} />
                      </ActionIcon>
                    </Group>

                    <Button
                      variant="light"
                      color="red"
                      fullWidth
                      loading={uninstalling}
                      leftSection={<IconTrash size={18} />}
                      onClick={handleUninstall}
                    >
                      Uninstall Game & Cleanup
                    </Button>

                    <Card
                      withBorder
                      p="xs"
                      radius="md"
                      style={{
                        minWidth: 150,
                        backgroundColor: "rgba(0,0,0,0.3)",
                      }}
                    >
                      <Stack gap={8}>
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap={8}>
                            <Text size="sm" fw={700}>
                              Run with DS4
                            </Text>
                            <Tooltip
                              label={
                                userData?.settings?.ds4WindowsPath
                                  ? `Global Path: ${userData.settings.ds4WindowsPath}`
                                  : "Configure Global DS4Windows Path"
                              }
                            >
                              <ActionIcon
                                size="xs"
                                variant="subtle"
                                color={
                                  userData?.settings?.ds4WindowsPath
                                    ? "green"
                                    : "gray"
                                }
                                onClick={async () => {
                                  const path = await (
                                    window as any
                                  ).electron.selectFile(
                                    "Select DS4Windows Executable",
                                    [
                                      {
                                        name: "Executables",
                                        extensions: ["exe"],
                                      },
                                    ],
                                  );
                                  if (path) {
                                    await updateKey("settings", {
                                      ...userData.settings,
                                      ds4WindowsPath: path,
                                    });
                                  }
                                }}
                              >
                                <IconSettings size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                          <Switch
                            size="sm"
                            checked={!!userData?.gameDs4Settings?.[game.id]}
                            disabled={!userData?.settings?.ds4WindowsPath}
                            onChange={async (event) => {
                              const settings = { ...userData?.gameDs4Settings };
                              if (event.currentTarget.checked)
                                settings[game.id] = true;
                              else delete settings[game.id];
                              await updateKey("gameDs4Settings", settings);
                            }}
                          />
                        </Group>
                        {userData?.settings?.ds4WindowsPath ? (
                          <Text size="10px" c="dimmed" truncate>
                            {userData.settings.ds4WindowsPath
                              .split(/[\\/]/)
                              .pop()}{" "}
                            configured
                          </Text>
                        ) : (
                          <Text size="10px" c="red.4" fw={500}>
                            Path not set - Configure to enable
                          </Text>
                        )}
                      </Stack>
                    </Card>
                  </Stack>
                )}
              </Stack>
            </Card>
          </Stack>
        </Box>

        {/* Repacks */}
        {!repackLoading && repacks.length > 0 && !isDownloaded && !gamePath && (
          <Box mt="xl">
            <Group justify="space-between" mb="xl">
              <Group gap="xs">
                <IconTrophy size={24} color="var(--mantine-color-blue-6)" />
                <Title order={2}>Available Repacks</Title>
              </Group>
              <Group gap="xs">
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconRefresh size={14} />}
                  loading={rescrapeLoading}
                  onClick={handleRescrapeAll}
                >
                  Refresh All
                </Button>
                <Badge size="lg" variant="light" color="blue">
                  {repacks.length}{" "}
                  {repacks.length === 1 ? "Version" : "Versions"}
                </Badge>
              </Group>
            </Group>

            <Stack gap="xl">
              {sortedRepacks.map((repack, idx) => {
                return (
                  <Card
                    key={idx}
                    withBorder
                    radius="xl"
                    p={0}
                    style={{
                      overflow: "hidden",
                      backgroundColor: "rgba(24, 100, 171, 0.05)",
                      borderColor: "rgba(24, 100, 171, 0.2)",
                    }}
                  >
                    <Box p="xl">
                      <Group justify="space-between" align="flex-start" mb="lg">
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Title order={3} size="h4" c="blue.4">
                              {repack.PostTitle}
                            </Title>
                            {repack.Genres.includes("HYPERVISOR") && (
                              <Badge color="red">HYPERVISOR</Badge>
                            )}
                          </Group>
                          <Group gap="md">
                            <Text size="sm" c="dimmed">
                              <Text span fw={700} c="blue.5">
                                Repack:{" "}
                              </Text>
                              {repack.PostFileRepackSize}
                            </Text>
                            <Text size="sm" c="dimmed">
                              <Text span fw={700} c="blue.5">
                                Original:{" "}
                              </Text>
                              {repack.PostFileOriginalSize}
                            </Text>
                            {repack.Timestamp && (
                              <Group gap={4}>
                                <IconCalendar
                                  size={14}
                                  color="var(--mantine-color-blue-5)"
                                />
                                <Text size="sm" c="dimmed">
                                  {new Date(
                                    repack.Timestamp,
                                  ).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </Text>
                              </Group>
                            )}
                          </Group>
                        </Stack>

                        <Group gap="xs">
                          {(() => {
                            const hasLinks =
                              repack.DirectLinks.length > 0 ||
                              repack.TorrentLinks.length > 0;
                            return (
                              <Tooltip
                                label={
                                  !hasLinks
                                    ? "No download links available"
                                    : "Download Options"
                                }
                              >
                                <span>
                                  <Stack gap={4} align="center">
                                    <Button
                                      size="xl"
                                      color="pink"
                                      variant="filled"
                                      leftSection={<IconDownload size={24} />}
                                      disabled={!hasLinks}
                                      onClick={() =>
                                        handleDownloadClick(repack)
                                      }
                                      styles={{
                                        root: {
                                          fontSize: "24px",
                                          fontWeight: 900,
                                          letterSpacing: "2px",
                                          boxShadow:
                                            "0 10px 20px rgba(233, 30, 99, 0.3)",
                                          transition: "transform 0.2s ease",
                                        },
                                      }}
                                    >
                                      DOWNLOAD
                                    </Button>
                                    <Text size="sm" c="dimmed" fw={700} mt="xs">
                                      Size: {repack.PostFileRepackSize} |
                                      Re-packed by FitGirl
                                    </Text>
                                  </Stack>
                                </span>
                              </Tooltip>
                            );
                          })()}

                          <Tooltip label="Refresh this repack">
                            <ActionIcon
                              variant="outline"
                              color="blue"
                              size="lg"
                              radius="md"
                              loading={individualRescrapeLoading.has(
                                repack.PostLink || "",
                              )}
                              disabled={!repack.PostLink || rescrapeLoading}
                              onClick={() =>
                                handleRescrapeSingle(repack.PostLink as string)
                              }
                            >
                              <IconRefresh size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="View on FitGirl">
                            <ActionIcon
                              variant="outline"
                              color="blue"
                              size="lg"
                              radius="md"
                              disabled={!repack.PostLink}
                              onClick={() =>
                                (window as any).electron.openExternal(
                                  repack.PostLink,
                                )
                              }
                            >
                              <IconExternalLink size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>

                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                        <Box>
                          <Text
                            fw={800}
                            size="xs"
                            c="dimmed"
                            tt="uppercase"
                            mb="sm"
                            style={{ letterSpacing: 1 }}
                          >
                            Torrent Links
                          </Text>
                          <Group gap="xs">
                            {repack.TorrentLinks.map((t: any, i: number) => (
                              <Button
                                key={i}
                                size="sm"
                                variant="light"
                                color="blue"
                                radius="md"
                                leftSection={<IconDownload size={16} />}
                                onClick={() =>
                                  (window as any).electron.openExternal(
                                    t.Magnet || t.ExternalLink,
                                  )
                                }
                              >
                                {t.Source}
                              </Button>
                            ))}
                          </Group>
                        </Box>
                        <Box>
                          <Text
                            fw={800}
                            size="xs"
                            c="dimmed"
                            tt="uppercase"
                            mb="sm"
                            style={{ letterSpacing: 1 }}
                          >
                            Direct Mirrors
                          </Text>
                          <SimpleGrid cols={2} spacing="xs">
                            {repack.DirectLinks.map((d: any, i: number) => (
                              <Button
                                key={i}
                                size="sm"
                                variant="subtle"
                                color="blue"
                                radius="md"
                                rightSection={
                                  d.Hoster.includes("FuckingFast") ? (
                                    <IconPackage
                                      size={14}
                                      color="var(--mantine-color-blue-4)"
                                    />
                                  ) : (
                                    <IconExternalLink size={14} />
                                  )
                                }
                                onClick={() => {
                                  const links =
                                    d.Links.Main || Object.values(d.Links)[0];
                                  if (links?.[0])
                                    (window as any).electron.openExternal(
                                      links[0],
                                    );
                                }}
                                style={{ justifyContent: "space-between" }}
                              >
                                {d.Hoster}
                              </Button>
                            ))}
                          </SimpleGrid>
                        </Box>
                      </SimpleGrid>
                      {/* Game Updates Dropdown */}
                      {repack.GameUpdates && repack.GameUpdates.length > 0 && (
                        <Box mt="xl">
                          <motion.div
                            initial={false}
                            animate={
                              isUpdateOpen[repack.PostID] ? "open" : "closed"
                            }
                          >
                            <Button
                              variant="light"
                              color="blue"
                              radius="md"
                              fullWidth
                              onClick={() =>
                                setIsUpdateOpen((prev) => ({
                                  ...prev,
                                  [repack.PostID]: !prev[repack.PostID],
                                }))
                              }
                              rightSection={
                                <motion.div
                                  animate={{
                                    rotate: isUpdateOpen[repack.PostID]
                                      ? 180
                                      : 0,
                                  }}
                                  transition={{ duration: 0.2 }}
                                  style={{ display: "inline-flex" }}
                                >
                                  <IconChevronDown size={18} />
                                </motion.div>
                              }
                              styles={{
                                root: {
                                  backgroundColor: "rgba(24, 100, 171, 0.1)",
                                  border: "1px solid rgba(24, 100, 171, 0.2)",
                                  justifyContent: "space-between",
                                },
                              }}
                            >
                              <Group gap="xs">
                                <IconPackage size={18} />
                                <Text fw={600}>Game Updates</Text>
                                <Badge
                                  size="sm"
                                  radius="xl"
                                  color="blue"
                                  variant="filled"
                                >
                                  {repack.GameUpdates.length}
                                </Badge>
                              </Group>
                            </Button>

                            <AnimatePresence>
                              {isUpdateOpen[repack.PostID] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0, y: -10 }}
                                  animate={{ opacity: 1, height: "auto", y: 0 }}
                                  exit={{ opacity: 0, height: 0, y: -10 }}
                                  transition={{
                                    duration: 0.3,
                                    ease: "easeInOut",
                                  }}
                                  style={{ overflow: "hidden" }}
                                >
                                  <Stack gap="xs" mt="sm">
                                    {repack.GameUpdates.map(
                                      (update, updateIdx) => (
                                        <motion.div
                                          key={updateIdx}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{
                                            delay: updateIdx * 0.05,
                                          }}
                                        >
                                          <Button
                                            fullWidth
                                            variant="subtle"
                                            color="gray"
                                            radius="md"
                                            onClick={() =>
                                              (
                                                window as any
                                              ).electron.openExternal(
                                                update.Url,
                                              )
                                            }
                                            leftSection={
                                              <IconDownload size={16} />
                                            }
                                            rightSection={
                                              <Text
                                                size="xs"
                                                c="dimmed"
                                                fs="italic"
                                              >
                                                Update #{updateIdx + 1}
                                              </Text>
                                            }
                                            styles={{
                                              root: {
                                                justifyContent: "space-between",
                                                transition: "all 0.2s ease",
                                                "&:hover": {
                                                  backgroundColor:
                                                    "rgba(24, 100, 171, 0.1)",
                                                  transform: "translateX(4px)",
                                                },
                                              },
                                            }}
                                          >
                                            <Group gap="sm">
                                              <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                transition={{
                                                  type: "spring",
                                                  stiffness: 400,
                                                }}
                                              >
                                                <IconFileText
                                                  size={14}
                                                  color="var(--mantine-color-blue-5)"
                                                />
                                              </motion.div>
                                              <Text size="sm" fw={500}>
                                                {update.Title}
                                              </Text>
                                            </Group>
                                          </Button>
                                        </motion.div>
                                      ),
                                    )}
                                  </Stack>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        </Box>
                      )}
                    </Box>

                    {(repack.Companies || repack.Languages) && (
                      <Box
                        px="xl"
                        py="md"
                        style={{
                          backgroundColor: "rgba(0,0,0,0.2)",
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <Group gap="xl">
                          {repack.Companies && (
                            <Group gap={6}>
                              <IconUsers
                                size={14}
                                color="var(--mantine-color-dimmed)"
                              />
                              <Text size="xs" c="dimmed">
                                {repack.Companies}
                              </Text>
                            </Group>
                          )}
                          {repack.Languages && (
                            <Text size="xs" c="dimmed">
                              <Text span fw={700} c="blue.8">
                                LANG:{" "}
                              </Text>
                              {repack.Languages}
                            </Text>
                          )}
                        </Group>
                      </Box>
                    )}
                  </Card>
                );
              })}
            </Stack>
          </Box>
        )}

        {repackLoading && (
          <Center py={100}>
            <Stack align="center" gap="md">
              <Loader color="blue" variant="bars" />
              <Text size="sm" c="dimmed" fw={500}>
                Searching for repacks...
              </Text>
            </Stack>
          </Center>
        )}

        {/* Summary */}
        <Box mt="xl">
          <Title
            order={2}
            mb="md"
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            About the Game
          </Title>
          <Text
            size="lg"
            style={{ lineHeight: 1.8, color: "rgba(255,255,255,0.8)" }}
          >
            {game.summary || "No summary available."}
          </Text>
          {game.storyline && (
            <Text
              mt="lg"
              style={{
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.6)",
                fontStyle: "italic",
              }}
            >
              {game.storyline}
            </Text>
          )}
        </Box>

        {/* Media Gallery (Spanning full width) */}
        <Stack gap={40} mt={40}>
          {screenshots.length > 0 && (
            <Box>
              <Title order={2} mb="xl">
                Screenshots
              </Title>
              <Carousel
                withIndicators
                slideSize="100%"
                slideGap="md"
                emblaOptions={{
                  loop: true,
                  dragFree: false,
                  align: "center",
                }}
                styles={{
                  indicator: {
                    width: 12,
                    transition: "width 250ms ease",
                    "&[dataActive]": { width: 40 },
                  },
                }}
              >
                {screenshots.map((url, index) => (
                  <Carousel.Slide key={index}>
                    <Image
                      alt={game.name}
                      src={url}
                      radius="lg"
                      fit="contain"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.3)",
                        backdropFilter: "blur(10px)",
                      }}
                    />
                  </Carousel.Slide>
                ))}
              </Carousel>
            </Box>
          )}

          {videos.length > 0 && (
            <Box>
              <Title order={2} mb="xl">
                Videos & Trailers
              </Title>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                {videos.map((video) => (
                  <Stack key={video.video_id} gap="xs">
                    <AspectRatio ratio={16 / 9}>
                      <iframe
                        src={`https://www.youtube.com/embed/${video.video_id}?rel=0`}
                        title={video.name}
                        style={{
                          border: 0,
                          borderRadius: "24px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        }}
                        name="google-disable-x-frame-options"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </AspectRatio>
                    <Text fw={600} size="sm" px="xs">
                      {video.name}
                    </Text>
                  </Stack>
                ))}
              </SimpleGrid>
            </Box>
          )}
        </Stack>
      </Container>
      <Box h={100} /> {/* Bottom spacer */}
      {/* File Selection Modal */}
      {selectedRepack && (
        <DownloadOptionsModal
          opened={optionsModalOpened}
          onClose={() => setOptionsModalOpened(false)}
          onConfirm={handleConfirmOptions}
          repack={selectedRepack}
        />
      )}
      {/* File Selection Modal */}
      {selectedRepack && selectedProvider && (
        <FileSelectionModal
          opened={fileModalOpened}
          onClose={() => setFileModalOpened(false)}
          onConfirm={handleConfirmDownload}
          mainFiles={
            selectedRepack.DirectLinks.find(
              (d) => d.Hoster === selectedProvider,
            )?.Links.Main || []
          }
          optionalFiles={
            selectedRepack.DirectLinks.find(
              (d) => d.Hoster === selectedProvider,
            )?.Links.Optional || []
          }
          selectiveFiles={
            selectedRepack.DirectLinks.find(
              (d) => d.Hoster === selectedProvider,
            )?.Links.Selective || []
          }
          repackSize={selectedRepack.PostFileRepackSize}
          partSizes={partSizes}
          onRescanFile={handleRescanFile}
          onRescanAll={handleRescanAll}
        />
      )}
      <MapViewer
        url={mapLink || ""}
        opened={mapViewerOpened}
        onClose={() => setMapViewerOpened(false)}
        gameName={game.name}
        onPlay={handleLaunch}
        isGameRunning={isGameRunning}
      />
    </Box>
  );
}
