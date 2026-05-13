"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Container,
  SimpleGrid,
  Title,
  Text,
  Stack,
  Group,
  TextInput,
  Box,
  Loader,
  Center,
  Badge,
  rem,
  ActionIcon,
} from "@mantine/core";
import {
  IconSearch,
  IconFilter,
  IconStar,
  IconDeviceGamepad2,
  IconCheck,
  IconBookmark,
  IconDownload,
  IconLibrary,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useUserData } from "../../lib/useUserData";
import { IgdbService, Game } from "../../lib/igdb";
import { GameCard } from "../../components/GameCard";

export default function LibraryPage() {
  const router = useRouter();
  const {
    userData,
    loading: userDataLoading,
    updateGameStatus,
  } = useUserData();
  const [searchQuery, setSearchQuery] = useState("");
  const [includedFilters, setIncludedFilters] = useState<string[]>(["playing"]);
  const [sortMode, setSortMode] = useState<
    "name" | "release_date" | "last_played"
  >("last_played");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [metadatas, setMetadatas] = useState<Record<number, Game>>({});
  const [loadingMetas, setLoadingMetas] = useState(false);

  const userGames = useMemo(
    () => userData?.userGames || {},
    [userData?.userGames],
  );
  const virtualGames = useMemo(
    () => userData?.virtualGames || {},
    [userData?.virtualGames],
  );
  const gamePaths = useMemo(
    () => userData?.gamePaths || {},
    [userData?.gamePaths],
  );
  const playTime = useMemo(
    () => userData?.playTime || {},
    [userData?.playTime],
  );

  // ── Step 1: pre-populate metadatas from the persisted igdbCache ──────────
  useEffect(() => {
    if (userDataLoading) return;
    const cached = userData?.igdbCache ?? {};
    if (Object.keys(cached).length === 0) return;

    setMetadatas((prev) => {
      const merged = { ...prev };
      let changed = false;
      Object.entries(cached).forEach(([id, game]) => {
        const numId = Number(id);
        if (!merged[numId]) {
          merged[numId] = game as Game;
          changed = true;
        }
      });
      return changed ? merged : prev;
    });
  }, [userDataLoading, userData?.igdbCache]);

  // ── Step 2: fetch only IDs not already in metadatas, then persist ─────────
  useEffect(() => {
    const fetchMetadata = async () => {
      const allIds = Object.keys(userGames).map(Number);
      const missingIds = allIds.filter((id) => id > 0 && !metadatas[id]);

      if (missingIds.length === 0) {
        return;
      }

      setLoadingMetas(true);

      try {
        const results = await IgdbService.getGamesByIds(missingIds);
        const newMetas = { ...metadatas };
        results.forEach((g: Game) => {
          newMetas[g.id] = g;
        });
        setMetadatas(newMetas);

        // Persist the newly fetched entries into igdbCache
        const existingCache: Record<number, Game> = userData?.igdbCache ?? {};
        const updatedCache = { ...existingCache };
        results.forEach((g: Game) => {
          updatedCache[g.id] = g;
        });
        await (window as any).electron.setUserData("igdbCache", updatedCache);
      } catch (error) {
        console.error(
          "Failed to fetch library metadata — library will use cached data",
          error,
        );
      } finally {
        setLoadingMetas(false);
      }
    };

    if (!userDataLoading) {
      fetchMetadata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userGames, userDataLoading]);

  const filteredGames = useMemo(() => {
    let games = Object.keys(userGames)
      .map((id) => {
        const gameId = Number(id);
        return metadatas[gameId] || virtualGames[gameId];
      })
      .filter((g) => !!g) as Game[];

    if (!includedFilters.includes("all") && includedFilters.length > 0) {
      games = games.filter((g) => {
        const statuses = userGames[g.id] || [];
        return includedFilters.some((f) => statuses.includes(f));
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      games = games.filter((g) => g.name.toLowerCase().includes(q));
    }

    return games.sort((a, b) => {
      let result = 0;
      if (sortMode === "name") {
        result = a.name.localeCompare(b.name);
      } else if (sortMode === "release_date") {
        const da = a.first_release_date ?? 0;
        const db = b.first_release_date ?? 0;
        result = da - db;
      } else if (sortMode === "last_played") {
        const ta = userData?.lastPlayedTimestamps?.[a.id] ?? 0;
        const tb = userData?.lastPlayedTimestamps?.[b.id] ?? 0;
        result = ta - tb;
      }
      return sortOrder === "asc" ? result : -result;
    });
  }, [
    userGames,
    metadatas,
    virtualGames,
    includedFilters,
    searchQuery,
    sortMode,
    sortOrder,
    userData?.lastPlayedTimestamps,
  ]);

  const handleGameClick = (gameId: number) => {
    router.push(`/?gameId=${gameId}&from=library`);
  };

  const handleStatusChange = async (gameId: number, status: string) => {
    const game = metadatas[gameId] || virtualGames[gameId];
    await updateGameStatus(gameId, status, game);
  };

  return (
    <Box
      style={{
        height: "100vh",
        background:
          "linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.8) 100%)",
      }}
    >
      <Container size="xl" py={40}>
        <Stack gap={40}>
          {/* Header Section with Glassmorphism */}
          <Box
            p="xl"
            style={{
              borderRadius: rem(24),
              background: "rgba(30, 41, 59, 0.4)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="xl">
              <Group gap="lg">
                <Box
                  style={{
                    padding: rem(16),
                    borderRadius: rem(16),
                    background:
                      "linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-cyan-5) 100%)",
                    boxShadow: "0 0 30px rgba(34, 139, 230, 0.3)",
                  }}
                >
                  <IconLibrary size={36} color="white" />
                </Box>
                <Stack gap={4}>
                  <Group gap="sm" align="center">
                    <Title
                      order={1}
                      style={{
                        fontSize: rem(42),
                        fontWeight: 800,
                        letterSpacing: "-0.5px",
                      }}
                    >
                      My Collection
                    </Title>
                    {(userDataLoading || loadingMetas) && (
                      <Loader size="sm" variant="dots" color="blue" />
                    )}
                  </Group>
                  <Text c="dimmed" size="lg" fw={500}>
                    {filteredGames.length}{" "}
                    {filteredGames.length === 1 ? "game" : "games"} in your
                    library
                  </Text>
                </Stack>
              </Group>

              <Group gap="md">
                <Group
                  gap="xs"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    padding: rem(4),
                    borderRadius: rem(12),
                  }}
                >
                  {[
                    { label: "Recent", value: "last_played" },
                    { label: "Release", value: "release_date" },
                    { label: "Name", value: "name" },
                  ].map((s) => (
                    <Badge
                      key={s.value}
                      variant={sortMode === s.value ? "filled" : "transparent"}
                      color={sortMode === s.value ? "blue" : "gray"}
                      style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                      onClick={() => setSortMode(s.value as any)}
                      size="lg"
                      radius="md"
                    >
                      {s.label}
                    </Badge>
                  ))}
                  <ActionIcon
                    variant="transparent"
                    color="gray"
                    size="lg"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                  >
                    {sortOrder === "asc" ? (
                      <IconSortAscending size={20} />
                    ) : (
                      <IconSortDescending size={20} />
                    )}
                  </ActionIcon>
                </Group>
                <TextInput
                  placeholder="Search games..."
                  leftSection={<IconSearch size={18} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  radius="xl"
                  size="md"
                  style={{ width: 280 }}
                  styles={{
                    input: {
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      backdropFilter: "blur(10px)",
                      transition: "all 0.2s ease",
                    },
                  }}
                />
              </Group>
            </Group>
          </Box>

          {/* Filters and Grid */}
          <Group gap="sm" style={{ overflowX: "auto", paddingBottom: rem(8) }}>
            {[
              { label: "All Games", value: "all", icon: null, color: "gray" },
              {
                label: "Playing",
                value: "playing",
                icon: IconDeviceGamepad2,
                color: "blue",
              },
              {
                label: "Favorites",
                value: "favorite",
                icon: IconStar,
                color: "pink",
              },
              {
                label: "Wishlist",
                value: "wishlist",
                icon: IconBookmark,
                color: "violet",
              },
              {
                label: "Completed",
                value: "completed",
                icon: IconCheck,
                color: "teal",
              },
              {
                label: "Downloaded",
                value: "downloaded",
                icon: IconDownload,
                color: "cyan",
              },
            ].map((filter) => {
              const isIncluded = includedFilters.includes(filter.value);

              // Default (Non-selected / Off)
              let variant = "outline";
              let badgeColor = "gray";
              let bgColor = "rgba(255,255,255,0.03)";
              let borderColor = "rgba(255,255,255,0.08)";
              let textColor = "rgba(255,255,255,0.6)";
              let iconColor = "rgba(255,255,255,0.4)";

              // Selected / On
              if (isIncluded) {
                variant = "filled";
                badgeColor = filter.color;
                bgColor = "";
                borderColor = "transparent";
                textColor = "white";
                iconColor = "white";
              }

              const handleFilterClick = () => {
                if (filter.value === "all") {
                  setIncludedFilters(["all"]);
                  return;
                }

                let newIncluded = includedFilters.filter((f) => f !== "all");

                if (newIncluded.includes(filter.value)) {
                  // On -> Off
                  newIncluded = newIncluded.filter((f) => f !== filter.value);
                  if (newIncluded.length === 0) {
                    newIncluded = ["all"];
                  }
                } else {
                  // Off -> On
                  newIncluded.push(filter.value);
                }

                setIncludedFilters(newIncluded);
              };

              return (
                <Badge
                  key={filter.value}
                  variant={variant as any}
                  color={badgeColor}
                  style={{
                    cursor: "pointer",
                    height: rem(38),
                    padding: `0 ${rem(18)}`,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  onClick={handleFilterClick}
                  leftSection={
                    filter.icon && (
                      <filter.icon
                        size={16}
                        color={iconColor}
                        stroke={isIncluded ? 2 : 1.5}
                      />
                    )
                  }
                  size="lg"
                >
                  {filter.label}
                </Badge>
              );
            })}
          </Group>

          {filteredGames.length === 0 ? (
            <Center py={120}>
              <Stack align="center" gap="md">
                <Box
                  style={{
                    padding: rem(24),
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <IconFilter size={56} color="var(--mantine-color-dark-3)" />
                </Box>
                <Text c="dimmed" size="lg" fw={500}>
                  No games match your current filters.
                </Text>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
              spacing="xl"
              verticalSpacing="xl"
            >
              {filteredGames.map((game) => (
                <Box
                  key={game.id}
                  style={{
                    height: "100%",
                    animation: "fadeIn 0.5s ease backwards",
                  }}
                >
                  <GameCard
                    game={game}
                    onClick={handleGameClick}
                    onStatusChange={handleStatusChange}
                    currentStatuses={userGames[game.id] || []}
                    exePath={gamePaths[game.id]}
                    playTime={playTime[game.id]}
                    onPlay={(path) => {
                      (window as any).electron.launchGame(path);
                    }}
                  />
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Container>
      <style>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
    </Box>
  );
}
