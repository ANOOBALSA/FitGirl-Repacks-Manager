"use client";

import React from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  ActionIcon,
  Card,
  Progress,
  Badge,
  Button,
  Box,
  ScrollArea,
  Checkbox,
  Tooltip,
  Collapse,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconDownload,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconChartBar,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { IgdbService, Game } from "../../lib/igdb";

function SpeedGraph({
  history,
}: {
  history: { time: number; speed: number }[];
}) {
  if (!history || history.length < 2) return <Box h={40} />;

  const maxSpeed = Math.max(...history.map((h) => h.speed), 1024 * 1024);
  const width = 200;
  const height = 40;

  const points = history
    .map((h, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - (h.speed / maxSpeed) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff006e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ff006e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M 0,${height} L ${points} L ${width},${height} Z`}
        fill="url(#speedGradient)"
      />
      <polyline fill="none" stroke="#ff006e" strokeWidth="2" points={points} />
    </svg>
  );
}

export default function DownloadsPage() {
  const router = useRouter();
  const [activeDownloads, setActiveDownloads] = React.useState<
    Record<string, any>
  >({});
  const [metadatas, setMetadatas] = React.useState<Record<number, Game>>({});

  const fetchState = React.useCallback(async () => {
    const electron = (window as any).electron;
    const downloads = await electron.getActiveDownloads();
    setActiveDownloads(downloads);

    const ids = Object.keys(downloads)
      .map(Number)
      .filter((id) => id > 0 && !metadatas[id]);
    if (ids.length > 0) {
      const results = await IgdbService.getGamesByIds(ids);
      const newMetas = { ...metadatas };
      results.forEach((g: Game) => (newMetas[g.id] = g));
      setMetadatas(newMetas);
    }
  }, [metadatas]);

  React.useEffect(() => {
    fetchState();
    const unsub = (window as any).electron.onDownloadProgress(
      (progress: any) => {
        setActiveDownloads((prev) => {
          if (progress.status === "deleted") {
            const next = { ...prev };
            delete next[progress.gameId];
            return next;
          }
          return { ...prev, [progress.gameId]: progress };
        });
      },
    );
    return unsub;
  }, [fetchState]);

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

  return (
    <Container size="xl" py="xl">
      <Group mb="xl">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={() => router.back()}
        >
          <IconArrowLeft size={24} />
        </ActionIcon>
        <Stack gap={0}>
          <Title order={2} c="blue">
            Downloads
          </Title>
          <Text size="sm" c="dimmed">
            Manage your active and completed downloads
          </Text>
        </Stack>
      </Group>

      {Object.entries(activeDownloads).length === 0 ? (
        <Card withBorder radius="md" p="xl" ta="center">
          <IconDownload
            size={48}
            color="rgba(255,255,255,0.1)"
            style={{ margin: "auto" }}
          />
          <Text fw={700} mt="md">
            No active downloads
          </Text>
          <Text size="sm" c="dimmed" mb="xl">
            Go to the store to start downloading your favorite games.
          </Text>
          <Button variant="light" color="blue" onClick={() => router.push("/")}>
            Browse Games
          </Button>
        </Card>
      ) : (
        <Stack gap="md">
          {Object.entries(activeDownloads).map(
            ([gameId, download]: [string, any]) => {
              const meta = metadatas[Number(gameId)];
              const isPaused = download.status === "paused";
              const isCompleted = download.status === "completed";
              const isError = download.status === "error";

              return (
                <DownloadItem
                  key={gameId}
                  gameId={gameId}
                  download={download}
                  meta={meta}
                  formatSize={formatSize}
                  formatSpeed={formatSpeed}
                />
              );
            },
          )}
        </Stack>
      )}
    </Container>
  );
}

function DownloadItem({
  gameId,
  download,
  meta,
  formatSize,
  formatSpeed,
}: any) {
  const isPaused = download.status === "paused";
  const isCompleted = download.status === "completed";
  const isError = download.status === "error";
  const [filesOpened, { toggle: toggleFiles }] = useDisclosure(false);
  const router = useRouter();

  return (
    <Card withBorder radius="lg" p="lg" bg="rgba(255, 255, 255, 0.02)">
      <Group wrap="nowrap" align="flex-start" gap="xl">
        {/* Game Cover */}
        <Box
          w={100}
          h={140}
          visibleFrom="xs"
          style={{
            borderRadius: "8px",
            overflow: "hidden",
            backgroundImage: `url(${meta?.cover?.url?.replace("t_thumb", "t_cover_big") || ""})`,
            backgroundSize: "cover",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        />

        {/* Details */}
        <Stack flex={1} gap="xs">
          <Group justify="space-between" wrap="nowrap">
            <Title
              order={4}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {meta?.name || `Game ${gameId}`}
            </Title>
            <Stack gap={0} align="flex-end">
              <Badge
                color={
                  isCompleted
                    ? "green"
                    : isError
                      ? "red"
                      : isPaused
                        ? "gray"
                        : "pink"
                }
                variant="light"
              >
                {isError && download.error === "RATE_LIMITED"
                  ? "Rate Limited"
                  : download.status}
              </Badge>
              {isError && download.error === "RATE_LIMITED" && (
                <Text size="10px" c="red.4" fw={700} mt={2} ta="right">
                  FuckingFast limit reached.
                  <br />
                  Please wait 5-10 mins.
                </Text>
              )}
              {!isCompleted && !isError && download.currentPart > 0 && (
                <Text size="10px" c="dimmed" mt={2}>
                  Part {download.currentPart} of {download.totalParts}
                </Text>
              )}
            </Stack>
          </Group>

          <Group gap="xs" mt={4}>
            <Text size="sm" fw={700} c="pink.4">
              {download.progress}%
            </Text>
            <Text size="xs" c="dimmed">
              {formatSize(download.downloadedSize)} /{" "}
              {formatSize(download.totalSize)}
            </Text>
            {!isPaused && !isCompleted && download.speed > 0 && (
              <Text size="xs" c="cyan" fw={700}>
                {formatSpeed(download.speed)}
              </Text>
            )}
          </Group>

          <Progress
            value={download.progress}
            size="sm"
            radius="xl"
            color={isCompleted ? "green" : isPaused ? "gray" : "pink"}
            mt={4}
          />

          {/* Speed Graph (Small) */}
          {!isCompleted && !isPaused && download.speedHistory?.length > 0 && (
            <Box mt="sm">
              <SpeedGraph history={download.speedHistory} />
            </Box>
          )}

          <Group gap="sm" mt="xs">
            {/* Toggle Files Button */}
            <Button
              variant="light"
              color="gray"
              size="compact-xs"
              leftSection={<IconChartBar size={14} />}
              onClick={toggleFiles}
            >
              {filesOpened ? "Hide Files" : "Show Files"}
            </Button>

            {isCompleted && (
              <Button
                variant="subtle"
                size="compact-xs"
                color="blue"
                onClick={() => router.push(`/?gameId=${gameId}`)}
              >
                View Game Details
              </Button>
            )}
          </Group>

          {filesOpened && (
            <Card withBorder radius="md" p="sm" bg="rgba(0,0,0,0.1)" mt="md">
              <Text size="xs" fw={700} mb="xs">
                Select Files to Download
              </Text>
              <ScrollArea h={150}>
                <Stack gap={4}>
                  {download.links.map((link: string, idx: number) => {
                    const fileName = link.includes("#")
                      ? link.split("#")[1]
                      : `part${idx + 1}.rar`;
                    const fileProgress = download.partProgress?.[idx] || 0;
                    const fileDownloaded = download.partDownloaded?.[idx] || 0;
                    const fileTotal = download.partTotal?.[idx] || 0;

                    return (
                      <Stack key={idx} gap={4}>
                        <Group justify="space-between" wrap="nowrap">
                          <Checkbox
                            size="xs"
                            label={fileName}
                            checked={download.selectedLinks[idx]}
                            disabled={isCompleted || isError}
                            onChange={(e) => {
                              (window as any).electron.toggleOptionalFile({
                                gameId,
                                index: idx,
                                enabled: e.currentTarget.checked,
                              });
                            }}
                          />
                          {download.selectedLinks[idx] && fileTotal > 0 && (
                            <Text size="10px" c="dimmed">
                              {formatSize(fileDownloaded)} /{" "}
                              {formatSize(fileTotal)}
                            </Text>
                          )}
                        </Group>
                        {download.selectedLinks[idx] && (
                          <Progress
                            value={fileProgress * 100}
                            size="2px"
                            color="cyan"
                            radius="xl"
                            animated={
                              download.status === "downloading" &&
                              download.currentPart === idx + 1
                            }
                          />
                        )}
                      </Stack>
                    );
                  })}
                </Stack>
              </ScrollArea>
            </Card>
          )}
        </Stack>

        {/* Controls */}
        <Stack gap="xs">
          {!isCompleted && (
            <ActionIcon
              variant="light"
              color={isPaused ? "green" : "yellow"}
              size="xl"
              radius="md"
              onClick={() => {
                if (isPaused) (window as any).electron.resumeDownload(gameId);
                else (window as any).electron.pauseDownload(gameId);
              }}
            >
              {isPaused ? (
                <IconPlayerPlay size={24} />
              ) : (
                <IconPlayerPause size={24} />
              )}
            </ActionIcon>
          )}
          <ActionIcon
            variant="light"
            color="red"
            size="xl"
            radius="md"
            onClick={() => {
              if (confirm("Delete this download?")) {
                (window as any).electron.deleteDownload(gameId, true);
              }
            }}
          >
            <IconTrash size={24} />
          </ActionIcon>
        </Stack>
      </Group>
    </Card>
  );
}
