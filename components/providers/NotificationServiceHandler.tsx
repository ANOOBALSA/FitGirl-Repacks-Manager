"use client";

import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  IconDeviceGamepad,
  IconExternalLink,
  IconRefresh,
  IconArrowRight,
  IconInfoCircle,
  IconAlertCircle,
} from "@tabler/icons-react";
import {
  Button,
  Group,
  Text,
  Stack,
  Modal,
  Badge,
  ScrollArea,
  Divider,
  Box,
  Title,
  Progress,
  Alert,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { useDisclosure } from "@mantine/hooks";

export function NotificationServiceHandler() {
  const router = useRouter();
  const [
    updateModalOpened,
    { open: openUpdateModal, close: closeUpdateModal },
  ] = useDisclosure(false);
  const [updateData, setUpdateData] = useState<any>(null);
  const [updateStatus, setUpdateStatus] = useState<{
    downloading: boolean;
    progress: any | null;
    installerPath: string | null;
    error: string | null;
  }>({
    downloading: false,
    progress: null,
    installerPath: null,
    error: null,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).electron) return;

    const navigateToRepack = (repack: any) => {
      router.push(`/repacks?repackId=${repack.PostID}`);
    };

    const unsubscribeNative = (window as any).electron.onNavigateToRepack(
      (repack: any) => {
        navigateToRepack(repack);
      },
    );

    const unsubscribeSettings = (window as any).electron.onNavigateToSettings(
      (data: any) => {
        if (data.section === "updates") {
          router.push("/settings?autoCheck=true");
        } else {
          router.push("/settings");
        }
      },
    );

    const unsubscribeUpdateModal = (window as any).electron.onShowUpdateModal(
      (result: any) => {
        setUpdateData(result);

        // Notify other components (like the Header) that an update is available
        window.dispatchEvent(
          new CustomEvent("fit:update-available", { detail: result }),
        );

        // If the update is already downloaded, set the path immediately
        if (result.isDownloaded && result.downloadedPath) {
          setUpdateStatus((prev) => ({
            ...prev,
            installerPath: result.downloadedPath,
          }));
        } else {
          // Reset status if it was previously set for another version
          setUpdateStatus({
            downloading: false,
            progress: null,
            installerPath: null,
            error: null,
          });
        }

        openUpdateModal();
      },
    );

    const handleOpenUpdateModal = () => {
      openUpdateModal();
    };

    window.addEventListener("fit:open-update-modal", handleOpenUpdateModal);

    const unsubscribeNotify = (window as any).electron.onNewRepackNotification(
      (repack: any) => {
        notifications.show({
          title: "New Repack Available!",
          message: (
            <Stack gap="xs">
              <Text size="sm" lineClamp={2} fw={500}>
                {repack.PostTitle}
              </Text>
              <Group justify="flex-end">
                <Button
                  variant="filled"
                  size="compact-xs"
                  color="blue.6"
                  leftSection={<IconExternalLink size={14} />}
                  onClick={() => {
                    navigateToRepack(repack);
                    notifications.hide(repack.PostID);
                  }}
                >
                  View Details
                </Button>
              </Group>
            </Stack>
          ),
          icon: <IconDeviceGamepad size={20} />,
          color: "blue",
          autoClose: 15000,
          withCloseButton: true,
          id: repack.PostID,
          styles: (theme: any) => ({
            root: {
              backgroundColor: "rgba(18, 18, 23, 0.95)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${theme.colors.blue[7]}`,
              padding: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            },
            title: {
              color: theme.white,
              fontWeight: 800,
              fontSize: "15px",
            },
            description: {
              color: theme.colors.gray[3],
            },
            closeButton: {
              color: theme.colors.gray[5],
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              },
            },
          }),
        });
      },
    );

    return () => {
      unsubscribeNative();
      unsubscribeSettings();
      unsubscribeUpdateModal();
      unsubscribeNotify();
      window.removeEventListener(
        "fit:open-update-modal",
        handleOpenUpdateModal,
      );
    };
  }, [router, openUpdateModal]);

  return (
    <>
      <Modal
        centered
        opened={updateModalOpened}
        onClose={closeUpdateModal}
        size="lg"
        radius="lg"
        withCloseButton={false}
        padding={0}
        overlayProps={{
          blur: 10,
          backgroundOpacity: 0.6,
        }}
        styles={{
          content: {
            backgroundColor: "rgba(20, 20, 25, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            overflow: "hidden",
          },
        }}
      >
        <Box
          p="xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(34, 139, 230, 0.15) 0%, rgba(20, 20, 25, 0) 100%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <Group justify="space-between" align="center">
            <Stack gap={4}>
              <Group gap="xs">
                <IconRefresh size={24} color="var(--mantine-color-blue-5)" />
                <Title
                  order={2}
                  style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}
                >
                  New Update Available
                </Title>
              </Group>
              <Text c="dimmed" size="sm">
                A newer version of FitGirl Repacks Manager is ready for you.
              </Text>
            </Stack>
            {updateData && (
              <Badge
                variant="filled"
                color="blue"
                size="xl"
                radius="md"
                style={{ height: 40, fontSize: 16 }}
              >
                v{updateData.latestVersion}
              </Badge>
            )}
          </Group>
        </Box>

        <Box p="xl">
          <Stack gap="md">
            <Group gap="xl" grow>
              <Stack gap={0}>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  Current Version
                </Text>
                <Text fw={600} size="lg">
                  v{updateData?.currentVersion || "Unknown"}
                </Text>
              </Stack>
              <Stack gap={0} align="center">
                <IconArrowRight size={20} color="dimmed" />
              </Stack>
              <Stack gap={0} align="flex-end">
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  New Version
                </Text>
                <Text fw={700} size="lg" c="blue.4">
                  v{updateData?.latestVersion || "Unknown"}
                </Text>
              </Stack>
            </Group>

            <Divider opacity={0.3} />

            {updateStatus.error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Download Failed"
                color="red"
                radius="md"
                variant="filled"
              >
                {updateStatus.error}
              </Alert>
            )}

            <Stack gap="xs">
              <Group gap="xs">
                <IconInfoCircle size={18} color="blue.4" />
                <Text fw={600} size="sm">
                  What's New
                </Text>
              </Group>
              <ScrollArea.Autosize mah={300} type="scroll" scrollbarSize={6}>
                <Box
                  p="md"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <Text
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--mantine-font-family-monospace)",
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    {updateData?.release?.releaseNotes ||
                      "No release notes provided."}
                  </Text>
                </Box>
              </ScrollArea.Autosize>
            </Stack>

            <Group grow mt="xl">
              {!updateStatus.downloading && !updateStatus.installerPath && (
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={closeUpdateModal}
                  radius="md"
                  size="md"
                >
                  Maybe Later
                </Button>
              )}

              {updateStatus.downloading && (
                <Stack gap="xs" flex={1}>
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      Downloading Update...
                    </Text>
                    <Text size="xs" c="dimmed">
                      {updateStatus.progress?.speed
                        ? `${(updateStatus.progress.speed / 1024 / 1024).toFixed(1)} MB/s`
                        : "Calculating..."}
                    </Text>
                  </Group>
                  <Progress
                    value={updateStatus.progress?.percent || 0}
                    animated
                    size="xl"
                    radius="xl"
                    color="blue"
                  />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {updateStatus.progress
                        ? `${(updateStatus.progress.transferred / 1024 / 1024).toFixed(1)} MB / ${(updateStatus.progress.total / 1024 / 1024).toFixed(1)} MB`
                        : ""}
                    </Text>
                    <Text size="xs" fw={700} c="blue">
                      {Math.round(updateStatus.progress?.percent || 0)}%
                    </Text>
                  </Group>
                </Stack>
              )}



              {!updateStatus.downloading && !updateStatus.installerPath && (
                <Button
                  color="blue"
                  radius="md"
                  size="md"
                  fullWidth
                  leftSection={<IconRefresh size={18} />}
                  onClick={async () => {
                    if (!updateData?.release) return;
                    setUpdateStatus((prev) => ({
                      ...prev,
                      downloading: true,
                      error: null,
                    }));

                    const removeListener = (
                      window as any
                    ).electron.onUpdateDownloadProgress((progress: any) => {
                      setUpdateStatus((prev) => ({ ...prev, progress }));
                    });

                    try {
                      const installerPath = await (
                        window as any
                      ).electron.downloadUpdate(
                        updateData.release.downloadUrl,
                        updateData.release.assetName,
                      );
                      setUpdateStatus((prev) => ({
                        ...prev,
                        downloading: false,
                        installerPath,
                      }));

                      // Automatically trigger installation after download
                      if (installerPath) {
                        (window as any).electron.installUpdate(installerPath);
                      }
                    } catch (err: any) {
                      console.error("Update download failed:", err);
                      setUpdateStatus((prev) => ({
                        ...prev,
                        downloading: false,
                        error: err.message,
                      }));
                    } finally {
                      removeListener();
                    }
                  }}
                >
                  Download & Install
                </Button>
              )}
            </Group>
          </Stack>
        </Box>
      </Modal>
    </>
  );
}
