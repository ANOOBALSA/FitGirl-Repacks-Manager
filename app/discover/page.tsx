"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Title,
  SimpleGrid,
  Container,
  Loader,
  Center,
  Text,
  Pagination,
  Box,
  Stack,
  Select,
  TextInput,
  Group,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useSearchParams, useRouter } from "next/navigation";
import {
  IconChevronDown,
  IconSearch,
  IconDeviceGamepad2,
} from "@tabler/icons-react";
import { GameCard } from "../../components/GameCard";
import { IgdbService, Game } from "../../lib/igdb";
import { useUserData } from "../../lib/useUserData";
import { Suspense } from "react";

const LIMIT = 20;

function DiscoverPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") || "";
  const filter = searchParams.get("filter") || "top_all";
  const pageParam = searchParams.get("page");
  const page = pageParam ? Number(pageParam) : 1;

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.keys(updates).forEach((key) => {
        if (updates[key] !== null) params.set(key, updates[key] as string);
        else params.delete(key);
      });
      router.push(`/discover?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSearch = (val: string) => {
    updateParams({ search: val || null, page: "1" });
  };

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData, updateKey, updateGameStatus } = useUserData();
  const userGames = userData?.userGames || {};

  const [totalPages, setTotalPages] = useState(1);

  const handleStatusChange = async (gameId: number, status: string) => {
    await updateGameStatus(gameId, status);
  };

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        let result: Game[] = [];
        let totalCount = 0;

        if (search) {
          result = await IgdbService.getGames("search", search, page, LIMIT);
          totalCount = await IgdbService.getCount("search", search);
        } else {
          const params =
            filter === "top_year" ? new Date().getFullYear() : undefined;
          result = await IgdbService.getGames(filter, params, page, LIMIT);
          totalCount = await IgdbService.getCount(filter, params);
        }

        setGames(result);
        const total = Math.ceil(totalCount / LIMIT) || 1;
        setTotalPages(total);

        if (page > total && total > 0) {
          updateParams({ page: total.toString() });
        }
      } catch (error) {
        console.error("Failed to fetch games", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [filter, page, search, updateParams]);

  const handleGameClick = (id: number) => {
    router.push(`/?gameId=${id}&from=discover`);
  };

  const discoverOptions = [
    { value: "top_all", label: "Top All Time" },
    { value: "top_year", label: "Top of the Year" },
    { value: "top_month", label: "Top of the Month" },
    { value: "upcoming", label: "Upcoming Games" },
    { value: "new", label: "New Releases" },
  ];

  return (
    <Box style={{ position: "relative", minHeight: "100%", zIndex: 1 }}>
      <Container size="xl" py="xl">
        <Box pb={80}>
          <Group justify="space-between" mb="xl">
            <Group gap="xl">
              <Title order={2}>Discover Games</Title>
              <TextInput
                placeholder="Search all games..."
                leftSection={<IconSearch size={16} />}
                size="md"
                radius="md"
                style={{ width: 400 }}
                value={searchInput}
                onChange={(e) => setSearchInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(searchInput);
                  }
                }}
              />
            </Group>
            <Select
              data={discoverOptions}
              value={filter}
              onChange={(val) =>
                updateParams({ filter: val || "top_all", page: "1" })
              }
              leftSection={<IconChevronDown size={16} />}
              style={{ width: 220 }}
              radius="md"
              variant="filled"
            />
          </Group>

          {loading ? (
            <Center style={{ height: "40vh" }}>
              <Loader size="xl" />
            </Center>
          ) : games.length === 0 ? (
            <Center style={{ height: "40vh" }}>
              <Stack align="center">
                <Text size="xl" c="dimmed">
                  No games found.
                </Text>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  currentStatuses={userGames[game.id] || []}
                  onStatusChange={handleStatusChange}
                  onClick={handleGameClick}
                />
              ))}
            </SimpleGrid>
          )}

          {totalPages > 1 && !loading && games.length > 0 && (
            <Box
              style={{
                position: "fixed",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1000,
                backgroundColor: "rgba(26, 27, 30, 0.65)",
                backdropFilter: "blur(12px)",
                padding: "8px 24px",
                borderRadius: 100,
                border: "1px solid var(--mantine-color-dark-4)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
              }}
            >
              <Pagination
                total={totalPages}
                value={page}
                onChange={(p) => {
                  updateParams({ page: p.toString() });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                color="blue"
                radius="xl"
                size="md"
                withEdges
              />
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <Center h="100vh">
          <Loader size="xl" />
        </Center>
      }
    >
      <DiscoverPageContent />
    </Suspense>
  );
}
