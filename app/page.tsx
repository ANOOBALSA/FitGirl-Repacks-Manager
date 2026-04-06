"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Center, Loader, Stack, Text, Box } from "@mantine/core";
import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useUserData } from "../lib/useUserData";
import { IgdbService, Game } from "../lib/igdb";
import { GameDetails } from "../components/GameDetails";
import { useInitialization } from "../components/providers/InitializationProvider";

export default function RootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameIdParam = searchParams.get("gameId");
  const fromParam = searchParams.get("from");
  const selectedGameId = gameIdParam ? Number(gameIdParam) : null;
  const { registerTask, markTaskComplete } = useInitialization();

  const {
    userData,
    loading: userDataLoading,
    updateKey,
    updateGameStatus,
  } = useUserData();
  const userGames = useMemo(
    () => userData?.userGames || {},
    [userData?.userGames],
  );
  const virtualGamesMetadata = useMemo(
    () => userData?.virtualGames || {},
    [userData?.virtualGames],
  );

  const [redirecting, setRedirecting] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (userDataLoading || redirecting || selectedGameId) return;

    setRedirecting(true);
    const lastPlayedTimestamps = userData?.lastPlayedTimestamps || {};

    let lastPlayedId: number | null = null;
    let maxTimestamp = 0;

    for (const [idStr, timestamp] of Object.entries(lastPlayedTimestamps)) {
      if (timestamp > maxTimestamp) {
        maxTimestamp = timestamp;
        lastPlayedId = Number(idStr);
      }
    }

    if (lastPlayedId) {
      router.push(`/?gameId=${lastPlayedId}`);
    } else {
      const gamesList = Object.keys(userData?.userGames || {});
      if (gamesList.length > 0) {
        router.push(`/?gameId=${gamesList[0]}`);
      } else {
        router.push("/discover");
      }
    }
  }, [userData, userDataLoading, router, redirecting, selectedGameId]);

  useEffect(() => {
    if (!selectedGameId) {
      setSelectedGame(null);
      return;
    }

    const taskId = `igdb:details:${selectedGameId}`;
    registerTask(taskId);

    if (selectedGame?.id === selectedGameId) {
      markTaskComplete(taskId);
      return;
    }

    const fetchDetails = async () => {
      if (selectedGameId <= 0) {
        if (virtualGamesMetadata[selectedGameId]) {
          setSelectedGame(virtualGamesMetadata[selectedGameId]);
        }
        return;
      }

      setDetailsLoading(true);
      try {
        const details = await IgdbService.getGameDetails(selectedGameId);
        setSelectedGame(details);
      } catch (error) {
        console.error("Failed to fetch game details", error);
        setSelectedGame(null);
      } finally {
        setDetailsLoading(false);
        markTaskComplete(taskId);
      }
    };

    fetchDetails();
  }, [
    selectedGameId,
    virtualGamesMetadata,
    selectedGame?.id,
    registerTask,
    markTaskComplete,
  ]);

  const handleStatusChange = async (gameId: number, status: string) => {
    await updateGameStatus(gameId, status, selectedGame || undefined);
  };

  if (!selectedGameId) {
    return (
      <Box h="100%" w="100%" bg="transparent">
        <Center h="calc(100vh - 60px)">
          <Stack align="center">
            <Loader size="xl" />
            <Text c="dimmed">Loading your library...</Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <Box style={{ position: "relative", minHeight: "100%", zIndex: 1 }}>
      {detailsLoading ? (
        <Center h="calc(100vh - 60px)">
          <Stack align="center">
            <Loader size="xl" />
            <Text c="dimmed">Loading Details...</Text>
          </Stack>
        </Center>
      ) : selectedGame ? (
        <Box p="0" h="100%">
          <GameDetails
            game={selectedGame}
            onBack={() => {
              if (fromParam === "discover") {
                router.back();
              } else {
                router.push("/");
              }
            }}
            onStatusChange={handleStatusChange}
            currentStatuses={userGames[selectedGame.id] || []}
            isEmbedded={fromParam !== "discover"}
          />
        </Box>
      ) : (
        <Center h="calc(100vh - 60px)">
          <Stack align="center" gap="xs">
            <IconDeviceGamepad2 size={48} color="var(--mantine-color-dark-4)" />
            <Text c="dimmed">Game details not found or loading failed.</Text>
          </Stack>
        </Center>
      )}
    </Box>
  );
}
