"use client";

import { useState } from "react";
import {
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  TextInput,
  ActionIcon,
  Loader,
  Center,
  Badge,
  Alert,
  SimpleGrid,
  Modal,
  Image,
  Select,
} from "@mantine/core";
import {
  IconFolderOpen,
  IconSearch,
  IconRefresh,
  IconCheck,
  IconDeviceGamepad2,
  IconAlertCircle,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { IgdbService, Game } from "../lib/igdb";
import { useUserData } from "../lib/useUserData";

interface DetectedGame {
  detectedName: string;
  executables: { name: string; path: string }[];
  selectedExePath: string;
  matchedGame?: Game;
  loading?: boolean;
}

export function DetectGamesModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [detectedGames, setDetectedGames] = useState<DetectedGame[]>([]);
  const [scanning, setScanning] = useState(false);

  const { userData, updateKey } = useUserData();
  const userGames = userData?.userGames || {};
  const gamePaths = userData?.gamePaths || {};
  const virtualGames = userData?.virtualGames || {};

  const handleSelectFolder = async () => {
    const path = await (window as any).electron.selectFolder();
    if (path) {
      setFolderPath(path);
      handleScan(path);
    }
  };

  const handleScan = async (path: string) => {
    setScanning(true);
    try {
      const results = await (window as any).electron.scanGames(path);
      const initialGames = results.map((g: any) => ({
        ...g,
        selectedExePath: g.executables[0]?.path || "",
        loading: true,
      }));
      setDetectedGames(initialGames);

      for (let i = 0; i < initialGames.length; i++) {
        const query = initialGames[i].detectedName;
        try {
          const matched = await IgdbService.getGames("search", query, 1, 1);
          setDetectedGames((prev) => {
            const next = [...prev];
            if (next[i]) {
              next[i] = {
                ...next[i],
                matchedGame: matched.length > 0 ? matched[0] : undefined,
                loading: false,
              };
            }
            return next;
          });
        } catch (e) {
          setDetectedGames((prev) => {
            const next = [...prev];
            if (next[i]) next[i].loading = false;
            return next;
          });
        }
      }
    } catch (error) {
      console.error("Scan error:", error);
    } finally {
      setScanning(false);
    }
  };

  const handleRemove = (index: number) => {
    const next = [...detectedGames];
    next.splice(index, 1);
    setDetectedGames(next);
  };

  const handleExeChange = (index: number, path: string) => {
    const next = [...detectedGames];
    next[index].selectedExePath = path;
    setDetectedGames(next);
  };

  const handleNameChange = (index: number, newName: string) => {
    const next = [...detectedGames];
    next[index].detectedName = newName;
    setDetectedGames(next);
  };

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const openSearch = (index: number) => {
    setSearchingIndex(index);
    setSearchModalOpen(true);
    handleSearch(detectedGames[index].detectedName);
  };

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      const results = await IgdbService.getGames("search", query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectMatchedGame = (game: Game) => {
    if (searchingIndex === null) return;
    const next = [...detectedGames];
    next[searchingIndex].matchedGame = game;
    setDetectedGames(next);
    setSearchModalOpen(false);
    setSearchingIndex(null);
  };

  const handleAddToLibrary = async (index: number) => {
    const dg = detectedGames[index];
    const gameId = dg.matchedGame ? dg.matchedGame.id : -(Date.now() + index);

    if (dg.matchedGame) {
      IgdbService.getGamesByIds([dg.matchedGame.id]).catch((err) =>
        console.error("Failed to proactively cache metadata:", err),
      );
    }

    const updatedUserGames = { ...userGames };
    const currentStatuses = updatedUserGames[gameId] || [];
    if (!currentStatuses.includes("playing")) {
      updatedUserGames[gameId] = [...currentStatuses, "playing"];
    }
    await updateKey("userGames", updatedUserGames);

    const updatedGamePaths = { ...gamePaths };
    updatedGamePaths[gameId] = dg.selectedExePath;
    await updateKey("gamePaths", updatedGamePaths);

    if (!dg.matchedGame) {
      const updatedVirtualGames = { ...virtualGames };
      updatedVirtualGames[gameId] = {
        id: gameId,
        name: dg.detectedName,
        status: "playing",
      } as Game;
      await updateKey("virtualGames", updatedVirtualGames);
    }

    const next = [...detectedGames];
    next.splice(index, 1);
    setDetectedGames(next);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={<Title order={3}>Detect Installed Games</Title>}
        size="xl"
        radius="md"
        centered
      >
        <Stack gap="xl" p="sm">
          <Group justify="space-between">
            <Text c="dimmed">Select a folder to scan for game executables</Text>
            <Button
              leftSection={<IconFolderOpen size={20} />}
              onClick={handleSelectFolder}
              size="md"
              radius="md"
            >
              {folderPath ? "Change Folder" : "Select Folder"}
            </Button>
          </Group>

          {folderPath && (
            <Alert
              icon={<IconCheck size={16} />}
              title="Scanning Folder"
              color="blue"
              radius="md"
              variant="light"
            >
              Selected:{" "}
              <Text span fw={700}>
                {folderPath}
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                leftSection={<IconRefresh size={14} />}
                ml="md"
                onClick={() => handleScan(folderPath)}
                loading={scanning}
              >
                Rescan
              </Button>
            </Alert>
          )}

          {scanning ? (
            <Center py={100}>
              <Stack align="center">
                <Loader size="xl" />
                <Text c="dimmed">Scanning for games...</Text>
              </Stack>
            </Center>
          ) : detectedGames.length > 0 ? (
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>
                  Detected Executables ({detectedGames.length})
                </Title>
              </Group>

              <Stack gap="xs">
                {detectedGames.map((game, index) => (
                  <Card key={index} withBorder radius="md" p="md">
                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      align="flex-start"
                    >
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <TextInput
                          label="Game Name"
                          value={game.detectedName}
                          onChange={(e) =>
                            handleNameChange(index, e.currentTarget.value)
                          }
                          variant="filled"
                          size="sm"
                          rightSection={
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => openSearch(index)}
                            >
                              <IconSearch size={16} />
                            </ActionIcon>
                          }
                        />
                        <Select
                          label="Executable"
                          size="xs"
                          data={game.executables.map((e) => ({
                            value: e.path,
                            label: e.name,
                          }))}
                          value={game.selectedExePath}
                          onChange={(val) => handleExeChange(index, val || "")}
                          variant="filled"
                        />
                        <Text size="xs" c="dimmed" truncate>
                          {game.selectedExePath}
                        </Text>
                      </Stack>

                      <Stack align="flex-end" gap="xs">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          onClick={() => handleRemove(index)}
                        >
                          <IconX size={14} />
                        </ActionIcon>

                        {game.loading ? (
                          <Group gap="xs">
                            <Loader size="xs" />
                            <Text size="xs" c="dimmed">
                              Matching...
                            </Text>
                          </Group>
                        ) : game.matchedGame ? (
                          <Group gap="xs">
                            <Badge
                              color="green"
                              leftSection={<IconCheck size={12} />}
                            >
                              Matched: {game.matchedGame.name}
                            </Badge>
                            <Button
                              size="xs"
                              variant="light"
                              color="blue"
                              onClick={() => openSearch(index)}
                            >
                              Change
                            </Button>
                          </Group>
                        ) : (
                          <Badge
                            color="orange"
                            leftSection={<IconAlertCircle size={12} />}
                          >
                            No Match Found
                          </Badge>
                        )}

                        <Button
                          leftSection={<IconPlus size={16} />}
                          onClick={() => handleAddToLibrary(index)}
                          variant="filled"
                          color="green"
                          size="sm"
                        >
                          Add to Library
                        </Button>
                      </Stack>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Stack>
          ) : folderPath && !scanning ? (
            <Center py={100}>
              <Stack align="center">
                <IconDeviceGamepad2 size={48} style={{ opacity: 0.2 }} />
                <Text c="dimmed">
                  No games detected in this folder. Try a different path.
                </Text>
              </Stack>
            </Center>
          ) : null}
        </Stack>
      </Modal>

      <Modal
        opened={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Search IGDB for Match"
        size="lg"
        radius="md"
        zIndex={2000}
      >
        <Stack gap="md">
          <TextInput
            placeholder="Search game title..."
            leftSection={<IconSearch size={16} />}
            defaultValue={
              searchingIndex !== null
                ? detectedGames[searchingIndex].detectedName
                : ""
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(e.currentTarget.value);
            }}
          />

          {searchLoading ? (
            <Center py="xl">
              <Loader size="md" />
            </Center>
          ) : (
            <SimpleGrid cols={2} spacing="md">
              {searchResults.map((game) => (
                <Card
                  key={game.id}
                  withBorder
                  padding="xs"
                  radius="md"
                  style={{ cursor: "pointer" }}
                  onClick={() => selectMatchedGame(game)}
                  className="repack-card"
                >
                  <Group wrap="nowrap" gap="sm">
                    <Image
                      src={game.cover?.url?.replace("t_thumb", "t_cover_small")}
                      alt={game.name}
                      width={40}
                      height={60}
                      fit="cover"
                      radius="md"
                    />
                    <Stack gap={2}>
                      <Text size="sm" fw={700} lineClamp={1}>
                        {game.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {game.first_release_date
                          ? new Date(
                              game.first_release_date * 1000,
                            ).getFullYear()
                          : "N/A"}
                      </Text>
                    </Stack>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Modal>
    </>
  );
}
