import React, { useState } from "react";
import {
  Modal,
  Button,
  Stack,
  Text,
  Group,
  Box,
  ThemeIcon,
  ScrollArea,
  Card,
} from "@mantine/core";
import { IconMagnet, IconServer, IconBolt } from "@tabler/icons-react";

interface DownloadOptionsModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (type: "direct" | "torrent", providerId: string) => void;
  repack: any;
}

export function DownloadOptionsModal({
  opened,
  onClose,
  onConfirm,
  repack,
}: DownloadOptionsModalProps) {
  const [selectedType, setSelectedType] = useState<"direct" | "torrent">(
    "direct",
  );
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  if (!repack) return null;

  const directLinks = repack.DirectLinks || [];
  const torrentLinks = repack.TorrentLinks || [];

  const handleConfirm = () => {
    if (selectedType && selectedProvider) {
      onConfirm(selectedType, selectedProvider);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={900} size="xl">
          Download Options
        </Text>
      }
      size="lg"
      centered
      styles={{
        content: {
          backgroundColor: "#1a1b1e",
          color: "white",
          borderRadius: "16px",
        },
        header: {
          backgroundColor: "#1a1b1e",
          color: "white",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        },
      }}
    >
      <Stack gap="xl" py="md">
        <Group justify="center" grow>
          <Button
            size="xl"
            variant={selectedType === "direct" ? "filled" : "light"}
            color={selectedType === "direct" ? "pink" : "gray"}
            onClick={() => {
              setSelectedType("direct");
              setSelectedProvider(null);
            }}
            leftSection={<IconServer size={24} />}
            styles={{
              root: { transition: "all 0.2s ease", borderRadius: "12px" },
            }}
          >
            Direct Download
          </Button>
          <Button
            size="xl"
            variant={selectedType === "torrent" ? "filled" : "light"}
            color={selectedType === "torrent" ? "green" : "gray"}
            onClick={() => {
              setSelectedType("torrent");
              setSelectedProvider(null);
            }}
            leftSection={<IconMagnet size={24} />}
            styles={{
              root: { transition: "all 0.2s ease", borderRadius: "12px" },
            }}
          >
            Torrent
          </Button>
        </Group>

        <Box>
          <Text fw={700} mb="md" size="lg" c="dimmed">
            {selectedType === "direct"
              ? "Select Direct Hoster"
              : "Select Torrent Source"}
          </Text>
          <ScrollArea h={250} offsetScrollbars>
            <Stack gap="sm">
              {selectedType === "direct" &&
                directLinks.map((d: any, i: number) => {
                  const isSupported = d.Hoster.includes("FuckingFast");
                  const isSelected = selectedProvider === d.Hoster;
                  return (
                    <Card
                      key={i}
                      withBorder
                      p="md"
                      radius="md"
                      onClick={() => setSelectedProvider(d.Hoster)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected
                          ? "rgba(233, 30, 99, 0.1)"
                          : "rgba(0,0,0,0.2)",
                        borderColor: isSelected
                          ? "var(--mantine-color-pink-5)"
                          : "rgba(255,255,255,0.1)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Group justify="space-between">
                        <Group>
                          <ThemeIcon
                            size="lg"
                            radius="md"
                            variant={isSelected ? "filled" : "light"}
                            color={isSelected ? "pink" : "blue"}
                          >
                            <IconServer size={20} />
                          </ThemeIcon>
                          <Text fw={isSelected ? 700 : 500} size="lg">
                            {d.Hoster}
                          </Text>
                        </Group>
                        {isSupported ? (
                          <Group gap={4}>
                            <IconBolt
                              size={16}
                              color="var(--mantine-color-yellow-4)"
                            />
                            <Text size="sm" c="yellow.4" fw={700}>
                              Auto-Download
                            </Text>
                          </Group>
                        ) : (
                          <Text size="sm" c="dimmed">
                            External Browser
                          </Text>
                        )}
                      </Group>
                    </Card>
                  );
                })}

              {selectedType === "torrent" &&
                torrentLinks.map((t: any, i: number) => {
                  const isSelected = selectedProvider === t.Source;
                  return (
                    <Card
                      key={i}
                      withBorder
                      p="md"
                      radius="md"
                      onClick={() => setSelectedProvider(t.Source)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected
                          ? "rgba(43, 138, 62, 0.1)"
                          : "rgba(0,0,0,0.2)",
                        borderColor: isSelected
                          ? "var(--mantine-color-green-5)"
                          : "rgba(255,255,255,0.1)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Group justify="space-between">
                        <Group>
                          <ThemeIcon
                            size="lg"
                            radius="md"
                            variant={isSelected ? "filled" : "light"}
                            color={isSelected ? "green" : "gray"}
                          >
                            <IconMagnet size={20} />
                          </ThemeIcon>
                          <Text fw={isSelected ? 700 : 500} size="lg">
                            {t.Source}
                          </Text>
                        </Group>
                        <Text size="sm" c="dimmed">
                          External Client
                        </Text>
                      </Group>
                    </Card>
                  );
                })}
            </Stack>
          </ScrollArea>
        </Box>

        <Group
          justify="flex-end"
          pt="md"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Button variant="subtle" color="gray" onClick={onClose} size="md">
            Cancel
          </Button>
          <Button
            color={selectedType === "direct" ? "pink" : "green"}
            size="md"
            disabled={!selectedProvider}
            onClick={handleConfirm}
          >
            Continue
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
