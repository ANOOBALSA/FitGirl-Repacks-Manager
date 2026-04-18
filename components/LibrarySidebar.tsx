"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Group,
  Stack,
  Text,
  Box,
  TextInput,
  ActionIcon,
  ScrollArea,
  Select,
  Loader,
  Center,
  NavLink,
  rem,
  Image,
  Badge,
  Portal,
  Tooltip,
} from "@mantine/core";
import {
  IconStar,
  IconDeviceGamepad2,
  IconCheck,
  IconBookmark,
  IconDownload,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconCompass,
  IconTrophy,
  IconRefresh,
  IconLibrary,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { IgdbService, Game } from "../lib/igdb";
import { useUserData } from "../lib/useUserData";
import { useOnlineStatus } from "../lib/useOnlineStatus";

type SortMode = "release_date" | "name" | "date_added" | "last_played";

interface LibrarySidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function LibrarySidebar({
  isCollapsed,
  onToggleCollapse,
}: LibrarySidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selectedGameId = searchParams.get("gameId")
    ? Number(searchParams.get("gameId"))
    : null;

  const [activeTags, setActiveTags] = useState<string[]>(["playing"]);
  const [sortMode, setSortMode] = useState<SortMode>("last_played");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDownloads, setActiveDownloads] = useState<Record<string, any>>(
    {},
  );

  const [metadatas, setMetadatas] = useState<Record<number, Game>>({});
  const [loading, setLoading] = useState(true);

  const { userData, loading: userDataLoading, reload } = useUserData();
  const userGames = useMemo(
    () => userData?.userGames || {},
    [userData?.userGames],
  );
  const statusTimestamps = useMemo(
    () => userData?.statusTimestamps || {},
    [userData?.statusTimestamps],
  );
  const virtualGamesMetadata = useMemo(
    () => userData?.virtualGames || {},
    [userData?.virtualGames],
  );
  const gamePaths = useMemo(
    () => userData?.gamePaths || {},
    [userData?.gamePaths],
  );

  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (Object.keys(virtualGamesMetadata).length > 0) {
      setMetadatas((prev) => ({
        ...prev,
        ...virtualGamesMetadata,
      }));
    }
  }, [virtualGamesMetadata]);

  useEffect(() => {
    if (userDataLoading) return;

    const allIds = Object.keys(userGames).map(Number);
    const missingIgdbIds = allIds.filter((id) => id > 0 && !metadatas[id]);

    if (missingIgdbIds.length === 0) {
      if (loading) setLoading(false);
      return;
    }

    const fetchMissing = async () => {
      setLoading(Object.keys(metadatas).length === 0);
      try {
        const results = await IgdbService.getGamesByIds(missingIgdbIds);
        const newMetas = { ...metadatas };
        results.forEach((g: Game) => {
          newMetas[g.id] = g;
        });
        setMetadatas(newMetas);
      } catch (error) {
        console.error("Failed to fetch missing games", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMissing();
  }, [userGames, userDataLoading, metadatas, loading]);

  useEffect(() => {
    const electron = (window as any).electron;

    electron.getActiveDownloads().then(setActiveDownloads);

    const unsub = electron.onDownloadProgress((progress: any) => {
      setActiveDownloads((prev) => {
        if (progress.status === "deleted") {
          const next = { ...prev };
          delete next[progress.gameId];
          return next;
        }
        return {
          ...prev,
          [progress.gameId]: progress,
        };
      });
    });

    return unsub;
  }, []);

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

  const handleTagToggle = (tag: string) => {
    if (activeTags.includes(tag) && activeTags.length === 1) {
      setActiveTags(["all"]);
    } else {
      setActiveTags([tag]);
    }
  };

  const allItems: Game[] = useMemo(() => {
    let filtered = Object.keys(userGames)
      .map((id) => {
        const gameId = Number(id);
        const metadata = metadatas[gameId] || virtualGamesMetadata[gameId];

        if (!metadata && (userGames[gameId] || gamePaths[gameId])) {
          return {
            id: gameId,
            name: `Unknown Game (${gameId})`,
            cover: undefined,
          } as any as Game;
        }
        return metadata;
      })
      .filter((g) => !!g) as Game[];

    filtered = filtered.filter((game) => {
      const statuses = userGames[game.id] || [];
      if (activeTags.includes("all")) return statuses.length > 0;
      return statuses.some((s) => activeTags.includes(s));
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((g) => g.name.toLowerCase().includes(q));
    }

    return filtered.sort((a, b) => {
      let result = 0;
      if (sortMode === "last_played") {
        const ta = userData?.lastPlayedTimestamps?.[a.id] || 0;
        const tb = userData?.lastPlayedTimestamps?.[b.id] || 0;
        result = ta - tb;
      } else if (sortMode === "name") {
        result = a.name.localeCompare(b.name);
      } else if (sortMode === "date_added") {
        const getLatestTs = (gameId: number) => {
          const tagsToCheck = activeTags.includes("all")
            ? ["wishlist", "favorite", "playing", "completed", "downloaded"]
            : activeTags;
          return Math.max(
            ...tagsToCheck.map((t) => statusTimestamps[`${gameId}:${t}`] ?? 0),
          );
        };
        result = getLatestTs(a.id) - getLatestTs(b.id);
      } else {
        const da = a.first_release_date ?? 0;
        const db = b.first_release_date ?? 0;
        result = da - db;
      }
      return sortOrder === "asc" ? result : -result;
    });
  }, [
    metadatas,
    userGames,
    userData?.lastPlayedTimestamps,
    sortMode,
    sortOrder,
    activeTags,
    statusTimestamps,
    searchQuery,
  ]);

  const handleCardClick = (id: number) => {
    router.push(`/?gameId=${id}`);
  };

  return (
    <>
      <Portal>
        {selectedGameId && metadatas[selectedGameId] && (
          <Box
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${metadatas[selectedGameId]?.cover?.url?.replace("t_thumb", "t_1080p") || metadatas[selectedGameId]?.cover?.url?.replace("t_thumb", "t_cover_big") || ""})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(20px) brightness(0.25)",
              zIndex: -1,
              transition: "background-image 0.5s ease",
            }}
          />
        )}
      </Portal>
      <Box
        w={isCollapsed ? 80 : 350}
        style={{
          borderRight: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(15, 16, 20, 0.6)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          height: "calc(100vh - 60px)",
          zIndex: 10,
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        <Box
          p="sm"
          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}
        >
          <Stack gap={4}>
            <NavLink
              component={Link}
              href="/library"
              active={pathname === "/library"}
              label={!isCollapsed && <Text size="sm">Library</Text>}
              leftSection={<IconLibrary size={18} stroke={1.5} />}
              variant="filled"
              styles={{
                root: {
                  borderRadius: rem(6),
                  padding: isCollapsed ? 0 : "8px 12px",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  height: isCollapsed ? 40 : undefined,
                },
                section: {
                  margin: isCollapsed ? 0 : undefined,
                  display: "flex",
                  justifyContent: "center",
                  width: isCollapsed ? "100%" : undefined,
                },
              }}
            />
            <NavLink
              component={Link}
              href="/discover"
              active={
                pathname === "/discover" ||
                (pathname === "/" && !selectedGameId)
              }
              label={
                !isCollapsed && (
                  <Group gap="xs">
                    <Text size="sm">Discover</Text>
                    {!isOnline && (
                      <Badge size="xs" variant="outline" color="gray">
                        Offline
                      </Badge>
                    )}
                  </Group>
                )
              }
              disabled={!isOnline}
              leftSection={<IconCompass size={18} stroke={1.5} />}
              variant="filled"
              styles={{
                root: {
                  borderRadius: rem(6),
                  padding: isCollapsed ? 0 : "8px 12px",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  height: isCollapsed ? 40 : undefined,
                },
                section: {
                  margin: isCollapsed ? 0 : undefined,
                  display: "flex",
                  justifyContent: "center",
                  width: isCollapsed ? "100%" : undefined,
                },
              }}
            />
            <NavLink
              component={Link}
              href="/repacks"
              active={pathname === "/repacks"}
              label={
                !isCollapsed && (
                  <Group gap="xs">
                    <Text size="sm">Repack Database</Text>
                    {!isOnline && (
                      <Badge size="xs" variant="outline" color="gray">
                        Offline
                      </Badge>
                    )}
                  </Group>
                )
              }
              leftSection={<IconTrophy size={18} stroke={1.5} />}
              variant="filled"
              disabled={!isOnline}
              styles={{
                root: {
                  borderRadius: rem(6),
                  padding: isCollapsed ? 0 : "8px 12px",
                  opacity: isOnline ? 1 : 0.5,
                  cursor: isOnline ? "pointer" : "not-allowed",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  height: isCollapsed ? 40 : undefined,
                },
                section: {
                  margin: isCollapsed ? 0 : undefined,
                  display: "flex",
                  justifyContent: "center",
                  width: isCollapsed ? "100%" : undefined,
                },
              }}
            />
          </Stack>
        </Box>

        {!isCollapsed ? (
          <Box
            p="md"
            style={{
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              position: "relative",
            }}
          >
            <Group justify="space-between" align="center" mb="xs">
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                style={{ textTransform: "uppercase", letterSpacing: 1 }}
              >
                My Library
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="xs"
                onClick={onToggleCollapse}
              >
                <IconChevronLeft size={14} />
              </ActionIcon>
            </Group>
            <Stack gap="xs">
              <Group wrap="nowrap" gap="xs">
                <TextInput
                  placeholder="Search library..."
                  leftSection={<IconSearch size={14} />}
                  size="xs"
                  radius="md"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="30px"
                  radius="md"
                  onClick={async () => {
                    setLoading(true);
                    await reload();
                    setLoading(false);
                  }}
                  disabled={loading}
                  title="Refresh Library"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                >
                  <IconRefresh
                    size={16}
                    className={loading ? "rotating" : ""}
                  />
                </ActionIcon>
              </Group>
              <Group wrap="nowrap" gap="xs">
                <Select
                  size="xs"
                  radius="md"
                  value={sortMode}
                  onChange={(val) => setSortMode(val as SortMode)}
                  data={[
                    { label: "Last Played", value: "last_played" },
                    { label: "Name", value: "name" },
                    { label: "Date Added", value: "date_added" },
                    { label: "Release Date", value: "release_date" },
                  ]}
                  style={{ flex: 1 }}
                  styles={{
                    input: {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "none",
                    },
                  }}
                />
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="30px"
                  radius="md"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                >
                  {sortOrder === "asc" ? (
                    <IconSortAscending size={16} />
                  ) : (
                    <IconSortDescending size={16} />
                  )}
                </ActionIcon>
              </Group>
              <Group gap={4} wrap="wrap">
                {[
                  { value: "playing", icon: IconDeviceGamepad2, color: "blue" },
                  { value: "favorite", icon: IconStar, color: "red" },
                  { value: "wishlist", icon: IconBookmark, color: "orange" },
                  { value: "completed", icon: IconCheck, color: "green" },
                  { value: "downloaded", icon: IconDownload, color: "cyan" },
                ].map((t) => {
                  const isActive = activeTags.includes(t.value);
                  return (
                    <ActionIcon
                      key={t.value}
                      variant={isActive ? "filled" : "light"}
                      color={isActive ? t.color : "gray"}
                      onClick={() => handleTagToggle(t.value)}
                      size="sm"
                      radius="md"
                    >
                      <t.icon size={14} />
                    </ActionIcon>
                  );
                })}
              </Group>
            </Stack>
          </Box>
        ) : (
          <Box
            py="md"
            style={{
              display: "flex",
              justifyContent: "center",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <ActionIcon
              variant="light"
              color="gray"
              size="md"
              onClick={onToggleCollapse}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </Box>
        )}

        <ScrollArea flex={1} p="xs">
          {loading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : allItems.length === 0 ? (
            !isCollapsed && (
              <Text size="xs" c="dimmed" ta="center" mt="xl">
                No games found
              </Text>
            )
          ) : (
            <Stack gap={4} align={isCollapsed ? "center" : "stretch"}>
              {allItems.map((game) => {
                const isSelected = selectedGameId === game.id;
                if (isCollapsed) {
                  return (
                    <Tooltip key={game.id} label={game.name} position="right">
                      <Box
                        onClick={() => handleCardClick(game.id)}
                        style={{
                          cursor: "pointer",
                          borderRadius: "8px",
                          overflow: "hidden",
                          width: "40px",
                          height: "50px",
                          flexShrink: 0,
                          backgroundColor: isSelected
                            ? "var(--mantine-color-blue-filled)"
                            : "#2C2E33",
                          border: isSelected ? "none" : "1px solid transparent",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Image
                          src={
                            game.cover?.url?.replace(
                              "t_thumb",
                              "t_cover_small",
                            ) || ""
                          }
                          alt={game.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            opacity: isSelected ? 1 : 0.7,
                          }}
                        />
                      </Box>
                    </Tooltip>
                  );
                }
                return (
                  <Box
                    key={game.id}
                    onClick={() => handleCardClick(game.id)}
                    p="xs"
                    style={{
                      cursor: "pointer",
                      borderRadius: "8px",
                      backgroundColor: isSelected
                        ? "var(--mantine-color-blue-filled)"
                        : "transparent",
                      transition: "background-color 0.2s ease",
                      border: isSelected ? "none" : "1px solid transparent",
                    }}
                    className={!isSelected ? "repack-card-lite" : ""}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Box
                        w={40}
                        h={50}
                        style={{
                          borderRadius: "4px",
                          overflow: "hidden",
                          flexShrink: 0,
                          backgroundColor: "#2C2E33",
                        }}
                      >
                        <Image
                          src={
                            game.cover?.url?.replace(
                              "t_thumb",
                              "t_cover_small",
                            ) || ""
                          }
                          alt={game.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </Box>
                      <Stack gap={0} style={{ overflow: "hidden", flex: 1 }}>
                        <Text
                          size="sm"
                          fw={500}
                          truncate
                          c={isSelected ? "white" : undefined}
                        >
                          {game.name}
                        </Text>
                        <Text
                          size="xs"
                          c={isSelected ? "rgba(255,255,255,0.7)" : "dimmed"}
                          truncate
                        >
                          {activeDownloads[game.id] &&
                          activeDownloads[game.id].status !== "completed" ? (
                            <Group gap={4} wrap="nowrap">
                              <Text size="10px" c="pink.4" fw={700}>
                                {activeDownloads[game.id].progress}%
                              </Text>
                              <Text size="10px" c="dimmed">
                                {activeDownloads[game.id].status === "paused"
                                  ? "Paused"
                                  : formatSpeed(activeDownloads[game.id].speed)}
                              </Text>
                            </Group>
                          ) : userData?.playTime?.[game.id] ? (
                            `${Math.floor(userData.playTime[game.id] / 60)}h ${userData.playTime[game.id] % 60}m`
                          ) : (
                            "Never played"
                          )}
                        </Text>
                      </Stack>

                      {gamePaths[game.id] && (
                        <ActionIcon
                          variant="filled"
                          color="blue"
                          size="md"
                          radius="md"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(game.id);
                            window.electron.launchGame(gamePaths[game.id]);
                          }}
                          style={{ flexShrink: 0 }}
                        >
                          <IconPlayerPlayFilled size={14} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Box>
                );
              })}
            </Stack>
          )}
        </ScrollArea>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .repack-card-lite:hover {
              background-color: var(--mantine-color-dark-6) !important;
            }
            .rotating {
              animation: rotate 2s linear infinite;
            }
            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `,
          }}
        />
      </Box>
    </>
  );
}
