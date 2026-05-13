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
  SimpleGrid,
  Modal,
  Image,
} from "@mantine/core";
import {
  IconFileCode,
  IconSearch,
  IconCheck,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { IgdbService, Game } from "../lib/igdb";
import { useUserData } from "../lib/useUserData";

export function ManualAddGameModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [exePath, setExePath] = useState<string | null>(null);
  const [detectedName, setDetectedName] = useState("");
  const [matchedGame, setMatchedGame] = useState<Game | undefined>();
  const [loading, setLoading] = useState(false);

  const { userData, updateKey } = useUserData();
  const userGames = userData?.userGames || {};
  const gamePaths = userData?.gamePaths || {};
  const virtualGames = userData?.virtualGames || {};

  const handleSelectFile = async () => {
    const result = await (window as any).electron.selectFile("Select Game Executable", [
      { name: "Executables", extensions: ["exe"] },
    ]);
    if (result) {
      setExePath(result);
      // Try to guess name from filename
      const fileName = result.split(/[\\/]/).pop()?.replace(/\.exe$/i, "") || "";
      // Clean up common suffixes like _x64, Launcher, etc.
      const cleanedName = fileName.replace(/(_x64|Launcher|Shipping)$/i, "").replace(/[_-]/g, " ");
      setDetectedName(cleanedName);
      handleSearch(cleanedName, true);
    }
  };

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (query: string, autoSelect = false) => {
    if (!query) return;
    setSearchLoading(true);
    if (autoSelect) setLoading(true);
    try {
      const results = await IgdbService.getGames("search", query);
      setSearchResults(results);
      if (autoSelect && results.length > 0) {
        setMatchedGame(results[0]);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
      if (autoSelect) setLoading(false);
    }
  };

  const selectMatchedGame = (game: Game) => {
    setMatchedGame(game);
    setSearchModalOpen(false);
  };

  const handleAddToLibrary = async () => {
    if (!exePath) return;
    
    const gameId = matchedGame ? matchedGame.id : -Date.now();

    if (matchedGame) {
      IgdbService.getGamesByIds([matchedGame.id]).catch((err) =>
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
    updatedGamePaths[gameId] = exePath;
    await updateKey("gamePaths", updatedGamePaths);

    if (!matchedGame) {
      const updatedVirtualGames = { ...virtualGames };
      updatedVirtualGames[gameId] = {
        id: gameId,
        name: detectedName,
        status: "playing",
      } as Game;
      await updateKey("virtualGames", updatedVirtualGames);
    }

    onClose();
    // Reset state
    setExePath(null);
    setDetectedName("");
    setMatchedGame(undefined);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={<Title order={3}>Add Game Manually</Title>}
        size="lg"
        radius="md"
        centered
      >
        <Stack gap="xl" p="sm">
          {!exePath ? (
            <Center py={40}>
              <Stack align="center" gap="md">
                <IconFileCode size={48} style={{ opacity: 0.3 }} />
                <Text c="dimmed" ta="center">
                  Select the main executable file (.exe) for the game you want to add.
                </Text>
                <Button
                  leftSection={<IconPlus size={20} />}
                  onClick={handleSelectFile}
                  size="md"
                  radius="md"
                >
                  Select Executable
                </Button>
              </Stack>
            </Center>
          ) : (
            <Stack gap="md">
              <Card withBorder radius="md" p="md">
                <Stack gap="sm">
                  <TextInput
                    label="Game Title"
                    value={detectedName}
                    onChange={(e) => setDetectedName(e.currentTarget.value)}
                    variant="filled"
                    size="md"
                    rightSection={
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => {
                          setSearchModalOpen(true);
                          handleSearch(detectedName);
                        }}
                      >
                        <IconSearch size={18} />
                      </ActionIcon>
                    }
                  />
                  
                  <Group justify="space-between" align="flex-end">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text size="xs" fw={700} c="dimmed">Executable Path</Text>
                      <Text size="sm" truncate style={{ maxWidth: 350 }}>
                        {exePath}
                      </Text>
                    </Stack>
                    <Button variant="subtle" size="xs" color="gray" onClick={handleSelectFile}>
                      Change
                    </Button>
                  </Group>

                  {loading ? (
                    <Group gap="xs">
                      <Loader size="xs" />
                      <Text size="xs" c="dimmed">Matching...</Text>
                    </Group>
                  ) : matchedGame ? (
                    <Group gap="xs" mt="xs">
                      <Badge
                        color="green"
                        variant="light"
                        leftSection={<IconCheck size={12} />}
                        size="lg"
                      >
                        Matched: {matchedGame.name}
                      </Badge>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="blue"
                        onClick={() => {
                          setSearchModalOpen(true);
                          handleSearch(detectedName);
                        }}
                      >
                        Change Match
                      </Button>
                    </Group>
                  ) : (
                    <Badge
                      color="orange"
                      variant="light"
                      size="lg"
                      mt="xs"
                    >
                      No Match Linked (Will use custom name)
                    </Badge>
                  )}
                </Stack>
              </Card>

              <Group justify="flex-end" mt="md">
                <Button variant="subtle" color="gray" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  leftSection={<IconPlus size={18} />}
                  onClick={handleAddToLibrary}
                  color="green"
                  size="md"
                  radius="md"
                  disabled={!exePath || !detectedName}
                >
                  Add to Library
                </Button>
              </Group>
            </Stack>
          )}
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
            defaultValue={detectedName}
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
                      fallbackSrc="/app_icon.png"
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
