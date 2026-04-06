"use client";

import {
  AppShell,
  Burger,
  Group,
  ActionIcon,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconMinus,
  IconWindowMaximize,
  IconX,
  IconDeviceGamepad2,
  IconDownload,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconLoader2,
  IconSettings,
  IconScreenShare,
  IconUser,
  IconTerminal2,
  IconHeart,
  IconSparkles,
  IconWindowMinimize,
  IconArrowLeft,
  IconArrowRight,
} from "@tabler/icons-react";
import { BigPictureView } from "./BigPictureView";
import { LibrarySidebar } from "./LibrarySidebar";
import { DetectGamesModal } from "./DetectGamesModal";
import { AuthModal } from "./auth/AuthModal";
import { useAuth } from "./providers/AuthProvider";
import { useSync } from "./providers/SyncProvider";
import { Menu, Button, Text, Box, Progress, Badge } from "@mantine/core";
import { IgdbService, Game } from "../lib/igdb";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const [detectModalOpened, { open: openDetect, close: closeDetect }] =
    useDisclosure();
  const router = useRouter();

  const handleMinimize = () => (window as any).electron?.minimize();
  const handleMaximize = () => (window as any).electron?.maximize();
  const handleClose = () => (window as any).electron?.close();

  const [bigPictureMode, setBigPictureMode] = React.useState(false);

  const [activeDownloads, setActiveDownloads] = React.useState<
    Record<string, any>
  >({});

  const [metadatas, setMetadatas] = React.useState<Record<number, Game>>({});
  const [isClient, setIsClient] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [swipeProgress, setSwipeProgress] = React.useState(0);
  const [swipeDirection, setSwipeDirection] = React.useState<
    "back" | "forward" | null
  >(null);
  const [isPrimed, setIsPrimed] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const electron = (window as any).electron;

    electron.getActiveDownloads().then(setActiveDownloads);
    const unsub = electron.onDownloadProgress((progress: any) => {
      setActiveDownloads((prev) => {
        if (progress.status === "deleted") {
          const next = { ...prev };
          delete next[progress.gameId];
          return next;
        }
        return { ...prev, [progress.gameId]: progress };
      });
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    const unsub = (window as any).electron?.onWindowStateChanged(
      (state: any) => {
        setIsMaximized(state.isMaximized);
      },
    );

    return () => {
      unsub();
    };
  }, []);

  React.useEffect(() => {
    const activeIds = Object.keys(activeDownloads).map(Number);
    const missing = activeIds.filter((id) => id > 0 && !metadatas[id]);
    if (missing.length > 0) {
      IgdbService.getGamesByIds(missing).then((results) => {
        if (results.length > 0) {
          setMetadatas((prev) => {
            const next = { ...prev };
            results.forEach((g: Game) => (next[g.id] = g));
            return next;
          });
        }
      });
    }
  }, [activeDownloads]);

  const navCooldown = React.useRef(0);
  const horizontalMomentum = React.useRef(0);

  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.5) {
        if (!isPrimed) {
          horizontalMomentum.current = 0;
          setSwipeProgress(0);
          setSwipeDirection(null);
        }
        return;
      }

      if (Date.now() - navCooldown.current < 500) {
        horizontalMomentum.current = 0;
        return;
      }

      horizontalMomentum.current += e.deltaX;

      const threshold = 100;
      const absMomentum = Math.abs(horizontalMomentum.current);
      const direction = horizontalMomentum.current < 0 ? "back" : "forward";

      setSwipeDirection(direction);
      const progress = Math.min(100, (absMomentum / threshold) * 100);
      setSwipeProgress(progress);

      if (progress >= 95) {
        setIsPrimed(true);
      } else {
        setIsPrimed(false);
      }

      clearTimeout((window as any)._gestureResetTimeout);
      (window as any)._gestureResetTimeout = setTimeout(() => {
        if (isPrimed) {
          if (horizontalMomentum.current < -threshold) {
            router.back();
          } else if (horizontalMomentum.current > threshold) {
            router.forward();
          }
          navCooldown.current = Date.now();
        }

        horizontalMomentum.current = 0;
        setSwipeProgress(0);
        setSwipeDirection(null);
        setIsPrimed(false);
      }, 50);
    };

    window.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      clearTimeout((window as any)._gestureResetTimeout);
    };
  }, [router, isPrimed]);

  const downloadingCount = Object.values(activeDownloads).filter(
    (d: any) => d.status !== "completed" && d.status !== "error",
  ).length;

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
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 350,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="0"
    >
      <AppShell.Header
        style={{
          WebkitAppRegion: "drag" as any,
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          background: "rgba(15, 16, 20, 0.6)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          zIndex: 1000,
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group style={{ WebkitAppRegion: "no-drag" as any }}>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Image
              src="/app_icon.png"
              alt="FitGirl Repacks Manager"
              width={24}
              height={24}
            />
          </Group>

          <Group
            gap="xs"
            style={{
              WebkitAppRegion: "no-drag" as any,
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {/* User Account Section */}
            <UserAccountSection />

            <ActionIcon
              variant="light"
              color="gray"
              radius="md"
              size="lg"
              onClick={() => router.push("/settings")}
            >
              <IconSettings size={20} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="green"
              radius="md"
              size="lg"
              onClick={() => setBigPictureMode(true)}
              title="Big Picture Mode"
            >
              <IconScreenShare size={20} />
            </ActionIcon>
            <ActionIcon
              onClick={openDetect}
              variant="light"
              color="blue"
              radius="md"
              size="lg"
            >
              <IconDeviceGamepad2 size={18} />
            </ActionIcon>
            <Menu shadow="md" width={320} position="bottom-end">
              <Menu.Target>
                <Box pos="relative">
                  <ActionIcon
                    variant="light"
                    color="pink"
                    radius="md"
                    size="lg"
                  >
                    <IconDownload size={20} />
                  </ActionIcon>
                  {downloadingCount > 0 && (
                    <Badge
                      variant="filled"
                      color="red"
                      size="xs"
                      circle
                      style={{
                        position: "absolute",
                        top: -5,
                        right: -5,
                      }}
                    >
                      {downloadingCount}
                    </Badge>
                  )}
                </Box>
              </Menu.Target>

              <Menu.Dropdown p="xs" mt={10}>
                <Menu.Item
                  leftSection={<IconDownload size={14} />}
                  onClick={() => router.push("/downloads")}
                >
                  <Text size="sm" fw={700}>
                    Downloads Page
                  </Text>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Label>Active Downloads</Menu.Label>
                {Object.entries(activeDownloads).length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">
                    No active downloads
                  </Text>
                ) : (
                  Object.entries(activeDownloads).map(
                    ([gameId, item]: [string, any]) => {
                      const isPaused = item.status === "paused";
                      if (
                        item.status === "completed" ||
                        item.status === "error"
                      )
                        return null;
                      return (
                        <Menu.Item key={gameId} p="xs">
                          <Stack gap={4}>
                            <Group justify="space-between" wrap="nowrap">
                              <Text
                                size="xs"
                                fw={700}
                                truncate
                                style={{ maxWidth: 180 }}
                              >
                                {metadatas[Number(gameId)]?.name ||
                                  `Game ${gameId}`}
                              </Text>
                              <Text size="xs" c="pink.4" fw={700}>
                                {item.progress}%
                              </Text>
                            </Group>
                            <Progress
                              value={item.progress}
                              size="xs"
                              color={isPaused ? "gray" : "pink"}
                            />
                            <Group justify="space-between">
                              <Text size="10px" c="dimmed">
                                {item.status}
                              </Text>
                              {!isPaused && item.speed > 0 && (
                                <Text size="10px" c="pink.4">
                                  {formatSpeed(item.speed)}
                                </Text>
                              )}
                            </Group>
                            <Group gap={4} mt={4}>
                              <ActionIcon
                                size="xs"
                                variant="light"
                                color={isPaused ? "green" : "yellow"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPaused)
                                    (window as any).electron.resumeDownload(
                                      String(gameId),
                                    );
                                  else
                                    (window as any).electron.pauseDownload(
                                      String(gameId),
                                    );
                                }}
                              >
                                {isPaused ? (
                                  <IconPlayerPlay size={10} />
                                ) : (
                                  <IconPlayerPause size={10} />
                                )}
                              </ActionIcon>
                              <ActionIcon
                                size="xs"
                                variant="light"
                                color="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  (window as any).electron.deleteDownload(
                                    String(gameId),
                                    true,
                                  );
                                }}
                              >
                                <IconTrash size={10} />
                              </ActionIcon>
                            </Group>
                          </Stack>
                        </Menu.Item>
                      );
                    },
                  )
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Group gap={5} style={{ WebkitAppRegion: "no-drag" as any }}>
            <Button
              variant="light"
              color="pink"
              size="sm"
              radius="md"
              leftSection={<IconHeart size={16} />}
              onClick={() =>
                (window as any).electron.openExternal(
                  "https://fitgirl-repacks.site/donations/",
                )
              }
            >
              Support FitGirl
            </Button>

            <Button
              variant="gradient"
              gradient={{ from: "indigo", to: "cyan" }}
              size="sm"
              radius="md"
              leftSection={<IconSparkles size={16} />}
              onClick={() => {
                (window as any).electron.openExternal(
                  "http://paypal.me/AAlsaedy",
                );
              }}
            >
              Support Me
            </Button>
            {isClient && (window as any).electron?.isDev && (
              <ActionIcon
                variant="subtle"
                color="orange"
                onClick={() => (window as any).electron.toggleDevTools()}
                title="Toggle DevTools"
              >
                <IconTerminal2 size={16} />
              </ActionIcon>
            )}

            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleMinimize}
              title="Minimize"
            >
              <IconMinus size={16} />
            </ActionIcon>

            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleMaximize}
              title="Maximize"
            >
              {isMaximized ? (
                <IconWindowMinimize size={16} />
              ) : (
                <IconWindowMaximize size={16} />
              )}
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={handleClose}
              title="Close"
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="0"
        style={{ borderRight: "none", backgroundColor: "transparent" }}
        withBorder={false}
      >
        <LibrarySidebar />
      </AppShell.Navbar>

      <AppShell.Main bg="transparent">
        <ScrollArea h="calc(100vh - 60px)" offsetScrollbars>
          {children}
        </ScrollArea>
      </AppShell.Main>
      <DetectGamesModal opened={detectModalOpened} onClose={closeDetect} />
      {bigPictureMode && (
        <BigPictureView onClose={() => setBigPictureMode(false)} />
      )}

      {/* Swipe Indicator Overlay */}
      {swipeDirection && swipeProgress > 0 && (
        <Box
          style={{
            position: "fixed",
            top: "50%",
            transition: "all 0.1s ease-out",
            opacity: swipeProgress / 100,
            transform: `translateY(-50%)`,
            left:
              swipeDirection === "back"
                ? -40 + (swipeProgress / 100) * 100
                : "auto",
            right:
              swipeDirection === "forward"
                ? -40 + (swipeProgress / 100) * 100
                : "auto",
            zIndex: 10000,
            pointerEvents: "none",
          }}
        >
          <Box
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            {swipeDirection === "back" ? (
              <IconArrowLeft
                size={34}
                color={isPrimed ? "#ff006e" : "#ff006e88"}
                style={{
                  transform: `scale(${0.6 + (swipeProgress / 100) * 0.4})`,
                  transition: "all 0.15s ease-out",
                  filter: isPrimed ? "drop-shadow(0 0 8px #ff006e)" : "none",
                }}
              />
            ) : (
              <IconArrowRight
                size={34}
                color={isPrimed ? "#ff006e" : "#ff006e88"}
                style={{
                  transform: `scale(${0.6 + (swipeProgress / 100) * 0.4})`,
                  transition: "all 0.15s ease-out",
                  filter: isPrimed ? "drop-shadow(0 0 8px #ff006e)" : "none",
                }}
              />
            )}
          </Box>
        </Box>
      )}
    </AppShell>
  );
}

function UserAccountSection() {
  const [authModalOpened, { open, close }] = useDisclosure();
  const { user, logout, isPasswordRecovery } = useAuth();
  const { syncing, sync } = useSync();
  const router = useRouter();

  React.useEffect(() => {
    if (isPasswordRecovery) {
      open();
    }
  }, [isPasswordRecovery, open]);

  const renderContent = () => {
    if (!user) {
      return (
        <Button
          variant="light"
          color="blue"
          radius="md"
          size="sm"
          leftSection={<IconUser size={18} />}
          onClick={open}
        >
          Login
        </Button>
      );
    }

    return (
      <Group gap="xs">
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="light"
              color="blue"
              radius="md"
              size="lg"
              title={user.user_metadata?.full_name || user.email}
            >
              <IconUser size={20} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Account</Menu.Label>
            <Menu.Item disabled>
              <Text size="xs" fw={700}>
                {user.user_metadata?.full_name || "User"}
              </Text>
              <Text size="xs" c="dimmed">
                {user.email}
              </Text>
            </Menu.Item>

            <Menu.Divider />
            <Menu.Label>Cloud Sync</Menu.Label>
            <Menu.Item
              leftSection={
                syncing ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconScreenShare size={14} />
                )
              }
              onClick={sync}
              disabled={syncing}
            >
              Sync Library with Cloud
            </Menu.Item>

            <Menu.Divider />
            <Menu.Item color="red" onClick={logout}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    );
  };

  return (
    <>
      {renderContent()}
      <AuthModal opened={authModalOpened} onClose={close} />
    </>
  );
}
