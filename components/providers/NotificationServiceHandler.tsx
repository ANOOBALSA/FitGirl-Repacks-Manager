"use client";

import { useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { IconDeviceGamepad, IconExternalLink } from "@tabler/icons-react";
import { Button, Group, Text, Stack } from "@mantine/core";
import { useRouter } from "next/navigation";

export function NotificationServiceHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).electron) return;

    const navigateToRepack = (repack: any) => {
      console.log("Navigating to repack:", repack.PostID);
      router.push(`/repacks?repackId=${repack.PostID}`);
    };

    const unsubscribeNative = (window as any).electron.onNavigateToRepack(
      (repack: any) => {
        navigateToRepack(repack);
      }
    );

    const unsubscribeNotify = (window as any).electron.onNewRepackNotification(
      (repack: any) => {
        console.log("Renderer received new repack notification:", repack);

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
      unsubscribeNotify();
    };
  }, [router]);

  return null;
}
