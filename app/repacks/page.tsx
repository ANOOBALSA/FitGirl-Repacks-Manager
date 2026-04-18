"use client";

import { useSearchParams, useRouter } from "next/navigation";

import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Card,
  Badge,
  Stack,
  Loader,
  Center,
  Pagination,
  Box,
  Image,
  ActionIcon,
  Tooltip,
  Modal,
  ScrollArea,
  UnstyledButton,
  TextInput,
  MultiSelect,
  Switch,
  SegmentedControl,
} from "@mantine/core";
import React, { useState, useEffect, useCallback, useMemo } from "react";

import {
  IconRefresh,
  IconClock,
  IconDatabase,
  IconEye,
  IconEyeOff,
  IconHeart,
  IconDeviceGamepad2,
  IconCheck,
  IconBookmark,
  IconDownload,
  IconSearch,
} from "@tabler/icons-react";
import { RepackCard } from "../../components/RepackCard";
import { GameDetails } from "../../components/GameDetails";
import { IgdbService, Game } from "../../lib/igdb";
import fitgirlService, { ensureHttps } from "../../lib/fitgirl";
import { useUserData } from "../../lib/useUserData";
import { DateInput } from "@mantine/dates";
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import { IconWifiOff } from "@tabler/icons-react";

const PAGE_SIZE = 12;

function PickerRow({
  game,
  onSelect,
}: {
  game: Game;
  onSelect: (id: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <UnstyledButton
      onClick={() => onSelect(game.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: 8, width: "100%" }}
    >
      <Group
        gap="sm"
        p="xs"
        align="center"
        wrap="nowrap"
        style={{
          borderRadius: 8,
          background: hovered ? "var(--mantine-color-dark-5)" : "transparent",
          transition: "background 0.12s ease",
        }}
      >
        <Image
          alt={game.name}
          src={game.cover?.url?.replace("t_thumb", "t_cover_big")}
          w={50}
          h={54}
          radius="sm"
          fit="contain"
          fallbackSrc="https://placehold.co/40x54?text=?"
        />
        <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          {game.name}
        </Text>
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {game.first_release_date && (
            <Badge size="xs" variant="light" color="blue">
              {new Date(game.first_release_date * 1000).getFullYear()}
            </Badge>
          )}
          {game.total_rating && (
            <Badge size="xs" variant="light" color="yellow">
              {Math.round(game.total_rating)}%
            </Badge>
          )}
          {game.genres?.slice(0, 1).map((g) => (
            <Badge key={g.name} size="xs" variant="dot" color="gray">
              {g.name}
            </Badge>
          ))}
        </Group>
      </Group>
    </UnstyledButton>
  );
}

export interface FitGirlRepack {
  id: string;
  PostID: string;
  Timestamp: string;
  PostTitle: string;
  PostLink: string;
  PostFileOriginalSize: string;
  PostFileRepackSize: string;
  CoverImage: string;
  Media?: { type: "image" | "video"; url: string }[];
  Screenshots?: string[];
  GameDescription?: string | null;
  RepackFeatures?: string[];
  TorrentLinks?: { Source: string; Magnet?: string; ExternalLink?: string }[];
  DirectLinks?: { Hoster: string; Links: Record<string, string[]> }[];
  Genres?: string[];
  Companies?: string;
  Languages?: string;
}


function RepacksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repackIdFromUrl = searchParams.get("repackId");
  const [repacks, setRepacks] = useState<FitGirlRepack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const isOnline = useOnlineStatus();
  const {
    userData,
    updateKey,
    updateGameStatus,
    loading: userDataLoading,
  } = useUserData();
  const { user } = useAuth();

  const userGames = useMemo(
    () => userData?.userGames || {},
    [userData?.userGames],
  );
  const igdbIdCache = useMemo(
    () => userData?.repackIgdbMapping || {},
    [userData?.repackIgdbMapping],
  );
  // --- ONE-TIME CACHE PURGE (MIGRATION) ---
  useEffect(() => {
    if (userData?.readRepacks && userData.readRepacks.length > 0) {
      const hasOldFormat = userData.readRepacks.some((id) =>
        id.includes("post-"),
      );
      if (hasOldFormat) {
        const cleanList = userData.readRepacks.filter(
          (id) => !id.includes("post-"),
        );
        updateKey("readRepacks", cleanList);
      }
    }
  }, [userData?.readRepacks]);

  const readPosts = useMemo(
    () => new Set(userData?.readRepacks || []),
    [userData?.readRepacks],
  );

  interface PickerState {
    postID: string;
    title: string;
    status?: string;
    results: Game[];
    isDetails?: boolean;
    repack?: FitGirlRepack;
  }
  const [igdbPicker, setIgdbPicker] = useState<PickerState | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showAdult, setShowAdult] = useState(false);
  const [filterMode, setFilterMode] = useState<
    "all" | "hypervisor" | "top-week" | "top-month" | "top-year"
  >("all");
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [totalRepacks, setTotalRepacks] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fitgirlService.getAvailableGenres().then(setAvailableGenres);
  }, []);

  useEffect(() => {}, []);

  const applyStatusWithIgdbGame = async (
    igdbId: number,
    postID: string,
    status: string,
  ) => {
    const newCache = { ...igdbIdCache, [postID]: igdbId };
    await updateKey("repackIgdbMapping", newCache);
    await updateGameStatus(igdbId, status);
  };

  const toggleRepackStatus = async (
    e: React.MouseEvent,
    postID: string,
    title: string,
    status: string,
  ) => {
    e.stopPropagation();

    const cachedId = igdbIdCache[postID];
    if (cachedId) {
      applyStatusWithIgdbGame(cachedId, postID, status);
      return;
    }

    setPickerLoading(true);
    setIgdbPicker({ postID, title, results: [], status, isDetails: false });

    try {
      const searchTerm = cleanTitle(title);
      let results = await IgdbService.getGames("search", searchTerm, 1, 8);

      if (results.length === 0 && searchTerm.includes(":")) {
        const fallbackTerm = searchTerm.split(":")[0].trim();
        results = await IgdbService.getGames("search", fallbackTerm, 1, 8);
      }

      if (results.length === 0) {
        console.warn(`No IGDB matches found for "${searchTerm}"`);
        return;
      }

      if (results.length === 1) {
        applyStatusWithIgdbGame(results[0].id, postID, status);
        setIgdbPicker(null);
        return;
      }
      setIgdbPicker({ postID, title, status, results, isDetails: false });
    } catch (error) {
      console.error("IGDB search failed:", error);
      setIgdbPicker(null);
    } finally {
      setPickerLoading(false);
    }
  };

  const toggleRead = async (e: React.MouseEvent, repack: FitGirlRepack) => {
    e.stopPropagation();
    const newRead = new Set(readPosts);
    const isAdding = !newRead.has(repack.id);

    if (!isAdding) {
      newRead.delete(repack.id);
    } else {
      newRead.add(repack.id);
    }

    // 1. Update local state instantly for UI responsiveness
    updateKey("readRepacks", Array.from(newRead));

    // 2. Perform atomic update in background (optimized!)
    try {
      const userDataRecord = await fitgirlService.getUserDataRecord();
      if (userDataRecord) {
        await fitgirlService.toggleReadAtomic(
          userDataRecord.id,
          repack.id,
          isAdding,
        );
      }
    } catch (err) {
      console.error("Atomic toggle failed:", err);
    }

    if (unreadOnly && !isAdding) {
      setRepacks((prev) => prev.filter((r) => r.id !== repack.id));
    }
  };

  const markOlderAsRead = async (
    e: React.MouseEvent,
    repack: FitGirlRepack,
  ) => {
    e.stopPropagation();
    try {
      // Use internal IDs for marking as read
      const olderItems = await fitgirlService.getIdsOlderThan(repack.Timestamp);
      if (olderItems && olderItems.length > 0) {
        const next = new Set(readPosts);
        olderItems.forEach((item: { id: string }) => next.add(item.id));

        const newReadList = Array.from(next);
        updateKey("readRepacks", newReadList);

        // For massive updates, we can either use atomic loop or just let bulk sync handle it.
        // Given this is a batch action, the current bulk sync is actually okay here,
        // but it's much faster now because it's only done once.

        if (unreadOnly) {
          setRepacks((prev) => prev.filter((r) => !next.has(r.id)));
        }
      }
    } catch (error) {
      console.error("Failed to mark older as read", error);
    }
  };

  const handleStatusChange = async (gameId: number, status: string) => {
    await updateGameStatus(gameId, status, selectedGame || undefined);
  };

  const fetchRepacks = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const result = await fitgirlService.getLatestPosts(page, PAGE_SIZE, {
          search: debouncedSearch,
          genres: selectedGenres,
          unreadOnly,
          readIds: unreadOnly ? Array.from(readPosts) : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          mode: filterMode,
        });
        setRepacks(result?.items || []);
        setTotalRepacks(result?.total || 0);

        const maxPage = Math.max(
          1,
          Math.ceil((result?.total || 0) / PAGE_SIZE),
        );
        if (page > maxPage) {
          setPage(maxPage);
        }
      } catch (error) {
        console.error("Failed to fetch repacks", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [
      page,
      debouncedSearch,
      selectedGenres,
      unreadOnly,
      showAdult,
      filterMode,
      dateFrom,
      dateTo,
    ],
  );

  useEffect(() => {
    fetchRepacks();
  }, [fetchRepacks]);

  useEffect(() => {
    if (unreadOnly) {
      fetchRepacks(true);
    }
  }, [readPosts, unreadOnly, fetchRepacks]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    selectedGenres,
    unreadOnly,
    showAdult,
    filterMode,
    dateFrom,
    dateTo,
  ]);

  const cleanTitle = (title: string) => {
    let cleaned = title
      .split(/[,+\[(\\]/)[0]
      .replace(/\s+v\d+.*$/, "")
      .replace(/\s+Build\s+\d+.*$/i, "")
      .replace(/\s+Update\s+\d+.*$/i, "")
      .replace(/DLCs?.*$/i, "")
      .trim();

    cleaned = cleaned
      .replace(
        /:\s*(Collector|Deluxe|Standard|Ultimate|Gold|Complete|Bundle|Limited).*$/i,
        "",
      )
      .trim();

    return cleaned;
  };

  const handleRepackClick = async (repack: FitGirlRepack) => {
    if (!readPosts.has(repack.PostID)) {
      const newRead = new Set(readPosts).add(repack.PostID);
      updateKey("readRepacks", Array.from(newRead));

      if (unreadOnly) {
        setRepacks((prev) => prev.filter((r) => r.id !== repack.id));
      }
    }

    const cachedId = igdbIdCache[repack.PostID];
    if (cachedId) {
      setDetailsLoading(true);
      try {
        const details = await IgdbService.getGameDetails(cachedId);
        setSelectedGame(details);
      } catch (error) {
        console.error("Failed to load game details", error);
      } finally {
        setDetailsLoading(false);
      }
      return;
    }

    setPickerLoading(true);
    setIgdbPicker({
      postID: repack.PostID,
      title: repack.PostTitle,
      results: [],
      isDetails: true,
      repack,
    });

    try {
      const searchTerm = cleanTitle(repack.PostTitle);
      let results = await IgdbService.getGames("search", searchTerm, 1, 8);

      if (results.length === 0 && searchTerm.includes(":")) {
        const fallbackTerm = searchTerm.split(":")[0].trim();
        results = await IgdbService.getGames("search", fallbackTerm, 1, 8);
      }

      if (results.length > 0) {
        if (results.length === 1) {
          const id = results[0].id;
          const newCache = { ...igdbIdCache, [repack.PostID]: id };
          await updateKey("repackIgdbMapping", newCache);
          setIgdbPicker(null);
          setDetailsLoading(true);
          try {
            const details = await IgdbService.getGameDetails(id);
            setSelectedGame(details);
          } catch (e) {
          } finally {
            setDetailsLoading(false);
          }
          return;
        }

        setIgdbPicker({
          postID: repack.PostID,
          title: repack.PostTitle,
          results,
          isDetails: true,
          repack,
        });
      } else {
        console.warn(
          `No IGDB matches found for "${searchTerm}", falling back to virtual game`,
        );
        setIgdbPicker(null);
        const virtualGame: Game = {
          id: -parseInt(repack.PostID.replace(/\D/g, "") || "0"),
          name: repack.PostTitle,
          summary: repack.GameDescription || "complete Desert.",
          cover: {
            id: 0,
            url: ensureHttps(repack.CoverImage),
            image_id: "repack-cover",
          },
          screenshots: repack.Media?.filter((m) => m.type === "image").map(
            (m, i) => ({
              id: i,
              url: ensureHttps(m.url),
              image_id: `repack-ss-${i}`,
            }),
          ),
          first_release_date: Math.floor(
            new Date(repack.Timestamp).getTime() / 1000,
          ),
          platforms: [],
          genres: [],
          total_rating: 0,
        };
        setSelectedGame(virtualGame);
      }
    } catch (error) {
      console.error("Failed to map repack to game:", error);
      setIgdbPicker(null);
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    if (repackIdFromUrl && !selectedGame && !loading && !pickerLoading) {
      const foundInCurrent = repacks.find((r) => r.PostID === repackIdFromUrl);
      if (foundInCurrent) {
        handleRepackClick(foundInCurrent);
      } else {
        fitgirlService.getPostByID(repackIdFromUrl).then((r) => {
          if (r) {
            handleRepackClick(r as any);
          }
        });
      }
    }
  }, [
    repackIdFromUrl,
    repacks,
    loading,
    selectedGame,
    pickerLoading,
    handleRepackClick,
  ]);

  const manualSearch = async (query: string) => {
    if (!igdbPicker) return;
    setPickerLoading(true);
    try {
      const results = await IgdbService.getGames("search", query, 1, 8);
      setIgdbPicker({ ...igdbPicker, results });
    } catch (error) {
      console.error("Manual search failed", error);
    } finally {
      setPickerLoading(false);
    }
  };

  if (detailsLoading) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Loader size="xl" />
          <Text c="dimmed">Matching with IGDB database...</Text>
        </Stack>
      </Center>
    );
  }

  if (selectedGame) {
    return (
      <GameDetails
        game={selectedGame}
        onBack={() => {
          setSelectedGame(null);
          // Clear repackId from URL if present
          if (repackIdFromUrl) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("repackId");
            const newUrl = `/repacks${params.toString() ? "?" + params.toString() : ""}`;
            router.replace(newUrl);
          }
        }}
        onStatusChange={handleStatusChange}
        currentStatuses={userGames[selectedGame.id] || []}
      />
    );
  }

  if (!isOnline) {
    return (
      <Container size="xl" py={100}>
        <Center>
          <Stack align="center" gap="xl">
            <Box
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.03)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <IconWifiOff
                size={60}
                stroke={1.5}
                color="var(--mantine-color-dark-3)"
              />
            </Box>
            <Stack align="center" gap="xs">
              <Title order={2}>Offline Mode</Title>
              <Text c="dimmed" ta="center" size="lg" style={{ maxWidth: 400 }}>
                The Repack Database requires an internet connection to browse
                and scrape the latest releases.
              </Text>
            </Stack>
            <Button
              variant="light"
              color="blue"
              size="md"
              radius="md"
              leftSection={<IconDeviceGamepad2 size={18} />}
              onClick={() => router.push("/discover")}
            >
              Go to Discover (Cache Enabled)
            </Button>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Stack gap={0}>
          <Title order={2}>FitGirl Repack Database</Title>
          <Text c="dimmed" size="sm">
            Browse everything recently posted on the official site
          </Text>
        </Stack>
        <Box style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <SegmentedControl
            value={filterMode}
            onChange={(value: any) => setFilterMode(value)}
            data={[
              { label: "All", value: "all" },
              { label: "HYPERVISOR", value: "hypervisor" },
              { label: "Week", value: "top-week" },
              { label: "Month", value: "top-month" },
              { label: "Year", value: "top-year" },
            ]}
            color="red"
            size="sm"
          />
        </Box>
        <Group>
          <Text size="xs" c="dimmed">
            {readPosts.size} posts read
          </Text>
          <Button
            leftSection={
              refreshing ? (
                <Loader size="xs" color="white" />
              ) : (
                <IconRefresh size={18} />
              )
            }
            onClick={() => fetchRepacks()}
            loading={refreshing}
            variant="light"
            color="blue"
          >
            {refreshing ? "loading..." : "Refresh"}
          </Button>
        </Group>
      </Group>

      {/* Filter Bar */}
      <Card
        withBorder
        radius="md"
        p="md"
        shadow="sm"
        mb="xl"
        bg="var(--mantine-color-dark-7)"
      >
        <Group align="flex-end" gap="md">
          <TextInput
            label="Search Repacks"
            placeholder="Search by title..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />

          <MultiSelect
            label="Genres"
            placeholder="All Genres"
            data={availableGenres}
            value={selectedGenres}
            onChange={setSelectedGenres}
            clearable
            searchable
            hidePickedOptions
            style={{ minWidth: 250, flex: 1 }}
          />

          <Stack gap={4}>
            <Text size="xs" fw={500}>
              Release Date Range
            </Text>
            <Group gap="xs">
              <DateInput
                placeholder="From"
                value={dateFrom as any}
                onChange={(val) => setDateFrom(val as any)}
                size="sm"
                style={{ width: 130 }}
              />
              <Text size="xs">to</Text>
              <DateInput
                placeholder="To"
                value={dateTo as any}
                onChange={setDateTo}
                size="sm"
                style={{ width: 130 }}
              />
            </Group>
          </Stack>

          <Box pb={4}>
            <Switch
              label="Unread Only"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.currentTarget.checked)}
              color="blue"
              size="md"
            />
          </Box>

          <Box pb={4}>
            {user?.user_metadata?.isSuperUser && (
              <Switch
                label="Show Adult"
                checked={showAdult}
                onChange={(e) => setShowAdult(e.currentTarget.checked)}
                color="red"
                size="md"
              />
            )}
          </Box>

          <Button
            variant="subtle"
            color="gray"
            onClick={() => {
              setSearch("");
              setSelectedGenres([]);
              setFilterMode("all");
              setUnreadOnly(false);
              setShowAdult(false);
              setDateFrom(null);
              setDateTo(null);
            }}
          >
            Reset
          </Button>
        </Group>
      </Card>

      {loading ? (
        <Center h="50vh">
          <Loader size="xl" />
        </Center>
      ) : repacks.length === 0 ? (
        <Center h="50vh">
          <Stack align="center">
            <IconDatabase size={50} color="gray" opacity={0.3} />
            <Text c="dimmed">
              No repacks found. Try refreshing the database.
            </Text>
          </Stack>
        </Center>
      ) : (
        <>
          <Stack gap="xl">
            {repacks.map((repack) => (
              <RepackCard
                key={repack.PostID}
                repack={repack}
                isRead={readPosts.has(repack.id)}
                igdbIdCache={igdbIdCache}
                userGames={userGames}
                onToggleRead={toggleRead}
                onMarkOlderAsRead={markOlderAsRead}
                onToggleStatus={toggleRepackStatus}
                onClick={handleRepackClick}
              />
            ))}
          </Stack>

          {/* Floating Pagination */}
          <Box
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              backgroundColor: "rgba(26, 27, 30, 0.95)",
              padding: "8px 24px",
              borderRadius: 100,
              border: "1px solid var(--mantine-color-dark-4)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
            }}
          >
            <Pagination
              total={Math.ceil(totalRepacks / PAGE_SIZE)}
              value={page}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              color="blue"
              radius="xl"
              size="md"
              withEdges
            />
          </Box>
        </>
      )}

      {/* IGDB Game Picker Modal */}
      <Modal
        centered
        opened={!!igdbPicker}
        onClose={() => setIgdbPicker(null)}
        title={
          <Stack gap={2}>
            <Text fw={700} size="md">
              Select the correct game
            </Text>
            <Text size="xs" c="dimmed" lineClamp={1}>
              Matching: {igdbPicker?.title}
            </Text>
          </Stack>
        }
        size="lg"
        radius="md"
        overlayProps={{ blur: 4 }}
      >
        <Stack gap="md">
          <TextInput
            placeholder="Search IGDB..."
            defaultValue={igdbPicker ? cleanTitle(igdbPicker.title) : ""}
            leftSection={<IconSearch size={16} />}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                manualSearch(e.currentTarget.value);
              }
            }}
            rightSection={pickerLoading ? <Loader size="xs" /> : null}
          />

          {pickerLoading && igdbPicker?.results.length === 0 ? (
            <Center py="xl">
              <Loader size="md" />
            </Center>
          ) : (
            <ScrollArea.Autosize mah={480}>
              <Stack gap="xs">
                {igdbPicker?.results.length === 0 && !pickerLoading && (
                  <Text c="dimmed" ta="center" py="xl">
                    No games found. Try a different search.
                  </Text>
                )}
                {igdbPicker?.results.map((game) => (
                  <PickerRow
                    key={game.id}
                    game={game}
                    onSelect={async (id) => {
                      const postID = igdbPicker.postID;
                      const newCache = { ...igdbIdCache, [postID]: id };
                      await updateKey("repackIgdbMapping", newCache);

                      if (igdbPicker.isDetails) {
                        setIgdbPicker(null);
                        setDetailsLoading(true);
                        try {
                          const details = await IgdbService.getGameDetails(id);
                          setSelectedGame(details);
                        } catch (e) {
                        } finally {
                          setDetailsLoading(false);
                        }
                      } else {
                        applyStatusWithIgdbGame(id, postID, igdbPicker.status!);
                        setIgdbPicker(null);
                      }
                    }}
                  />
                ))}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Stack>
      </Modal>
    </Container>
  );
}

import { Suspense } from "react";
import { useAuth } from "../../components/providers/AuthProvider";

export default function RepacksPage() {
  return (
    <Suspense
      fallback={
        <Center h="100vh">
          <Loader size="xl" />
        </Center>
      }
    >
      <RepacksPageContent />
    </Suspense>
  );
}
