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
  const [activeFilter, setActiveFilter] = useState<string>("playing");
  const [sortMode, setSortMode] = useState<
    "name" | "release_date" | "last_played"
  >("last_played");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [metadatas, setMetadatas] = useState<Record<number, Game>>({});
  const [loadingMetas, setLoadingMetas] = useState(true);

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

  useEffect(() => {
    const fetchMetadata = async () => {
      const allIds = Object.keys(userGames).map(Number);
      const missingIds = allIds.filter((id) => id > 0 && !metadatas[id]);

      if (missingIds.length === 0) {
        setLoadingMetas(false);
        return;
      }

      try {
        const results = await IgdbService.getGamesByIds(missingIds);
        const newMetas = { ...metadatas };
        results.forEach((g: Game) => {
          newMetas[g.id] = g;
        });
        setMetadatas(newMetas);
      } catch (error) {
        console.error("Failed to fetch library metadata", error);
      } finally {
        setLoadingMetas(false);
      }
    };

    if (!userDataLoading) {
      fetchMetadata();
    }
  }, [userGames, userDataLoading, metadatas]);

  const filteredGames = useMemo(() => {
    let games = Object.keys(userGames)
      .map((id) => {
        const gameId = Number(id);
        return metadatas[gameId] || virtualGames[gameId];
      })
      .filter((g) => !!g) as Game[];

    if (activeFilter !== "all") {
      games = games.filter((g) => userGames[g.id]?.includes(activeFilter));
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
    activeFilter,
    searchQuery,
    sortMode,
    sortOrder,
    userData?.lastPlayedTimestamps,
  ]);

  const handleGameClick = (gameId: number) => {
    router.push(`/?gameId=${gameId}`);
  };

  const handleStatusChange = async (gameId: number, status: string) => {
    const game = metadatas[gameId] || virtualGames[gameId];
    await updateGameStatus(gameId, status, game);
  };

  if (userDataLoading || loadingMetas) {
    return (
      <Center h="calc(100vh - 120px)">
        <Stack align="center" gap="md">
          <Loader size="xl" variant="bars" color="blue" />
          <Text c="dimmed" fw={500}>
            Loading your collection...
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end" wrap="nowrap">
          <Stack gap={4}>
            <Group gap="xs">
              <IconLibrary size={28} color="var(--mantine-color-blue-6)" />
              <Title order={1} style={{ fontSize: rem(32) }}>
                My Library
              </Title>
            </Group>
            <Text c="dimmed" size="sm">
              Manage and browse your collection of {filteredGames.length} games
            </Text>
          </Stack>

          <Group gap="sm">
            <Group gap="xs">
              {[
                { label: "Recent", value: "last_played" },
                { label: "Release", value: "release_date" },
                { label: "Name", value: "name" },
              ].map((s) => (
                <Badge
                  key={s.value}
                  variant={sortMode === s.value ? "filled" : "light"}
                  color="gray"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSortMode(s.value as any)}
                  size="sm"
                >
                  {s.label}
                </Badge>
              ))}
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                {sortOrder === "asc" ? (
                  <IconSortAscending size={14} />
                ) : (
                  <IconSortDescending size={14} />
                )}
              </ActionIcon>
            </Group>
            <TextInput
              placeholder="Search your library..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              radius="md"
              style={{ width: 250 }}
              styles={{
                input: {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            />
          </Group>
        </Group>

        <Group gap="xs">
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
              color: "red",
            },
            {
              label: "Wishlist",
              value: "wishlist",
              icon: IconBookmark,
              color: "orange",
            },
            {
              label: "Completed",
              value: "completed",
              icon: IconCheck,
              color: "green",
            },
            {
              label: "Downloaded",
              value: "downloaded",
              icon: IconDownload,
              color: "cyan",
            },
          ].map((filter) => (
            <Badge
              key={filter.value}
              variant={activeFilter === filter.value ? "filled" : "light"}
              color={activeFilter === filter.value ? filter.color : "gray"}
              style={{
                cursor: "pointer",
                height: rem(32),
                padding: `0 ${rem(12)}`,
              }}
              onClick={() => setActiveFilter(filter.value)}
              leftSection={filter.icon && <filter.icon size={14} />}
            >
              {filter.label}
            </Badge>
          ))}
        </Group>

        {filteredGames.length === 0 ? (
          <Center py={100}>
            <Stack align="center" gap="sm">
              <IconFilter size={48} color="var(--mantine-color-dark-4)" />
              <Text c="dimmed" fw={500}>
                No games match your current filters.
              </Text>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
            spacing="lg"
          >
            {filteredGames.map((game) => (
              <Box key={game.id} style={{ height: "100%" }}>
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
  );
}
