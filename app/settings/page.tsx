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
  TextInput,
  Button,
  Switch,
  Divider,
  Badge,
  SegmentedControl,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconFolder,
  IconArchive,
  IconDeviceGamepad2,
  IconUser,
  IconLogout,
  IconBell,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useDisclosure } from "@mantine/hooks";
import { useAuth } from "../../components/providers/AuthProvider";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = React.useState<any>({
    downloadDirectory: "",
    unpackAfterDownload: true,
    closeToTray: true,
    runOnStartup: false,
    startMinimized: false,
    ds4WindowsPath: "",
  });

  const fetchSettings = React.useCallback(async () => {
    const s = await (window as any).electron.getSettings();
    if (s) setSettings(s);
  }, []);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSelectFolder = async () => {
    const folder = await (window as any).electron.selectFolder();
    if (folder) {
      const newSettings = { ...settings, downloadDirectory: folder };
      setSettings(newSettings);
      await (window as any).electron.updateSettings(newSettings);
    }
  };

  const handleSelectDS4 = async () => {
    const filePath = await (window as any).electron.selectFile(
      "Select DS4Windows Executable",
      [{ name: "Executables", extensions: ["exe"] }],
    );
    if (filePath) {
      const newSettings = { ...settings, ds4WindowsPath: filePath };
      setSettings(newSettings);
      await (window as any).electron.updateSettings(newSettings);
    }
  };

  const handleToggleUnpack = async (val: boolean) => {
    const newSettings = { ...settings, unpackAfterDownload: val };
    setSettings(newSettings);
    await (window as any).electron.updateSettings(newSettings);
  };

  const handleToggleSetting = async (key: string, val: boolean) => {
    const newSettings = { ...settings, [key]: val };
    setSettings(newSettings);
    await (window as any).electron.updateSettings(newSettings);
  };

  return (
    <Container size="md" py="xl">
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
            Settings
          </Title>
          <Text size="sm" c="dimmed">
            Configure your application preferences
          </Text>
        </Stack>
      </Group>

      <Stack gap="lg">
        <Card
          withBorder
          radius="lg"
          p="xl"
          bg="rgba(255, 255, 255, 0.05)"
          style={{ borderLeft: "4px solid var(--mantine-color-blue-6)" }}
        >
          <UserStatusSection />
        </Card>

        {/* Downloads Section */}
        <Card withBorder radius="lg" p="xl" bg="rgba(255, 255, 255, 0.02)">
          <Stack gap="md">
            <Group gap="xs">
              <IconFolder size={20} color="#228be6" />
              <Text fw={700}>Downloads</Text>
            </Group>

            <Divider color="rgba(255,255,255,0.05)" />

            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Default Download Directory
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                RAR archives and setup files will be downloaded to this folder.
              </Text>
              <Group>
                <TextInput
                  value={settings.downloadDirectory}
                  readOnly
                  flex={1}
                  styles={{ input: { backgroundColor: "rgba(0,0,0,0.2)" } }}
                />
                <Button
                  variant="light"
                  color="blue"
                  onClick={handleSelectFolder}
                >
                  Change Folder
                </Button>
              </Group>
            </Stack>

            <Divider color="rgba(255,255,255,0.05)" />

            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Default Game Installation Directory
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                Games will be installed in this folder (under their own
                subfolders).
              </Text>
              <Group>
                <TextInput
                  value={settings.defaultInstallDirectory || ""}
                  readOnly
                  flex={1}
                  styles={{ input: { backgroundColor: "rgba(0,0,0,0.2)" } }}
                />
                <Button
                  variant="light"
                  color="blue"
                  onClick={async () => {
                    const folder = await (
                      window as any
                    ).electron.selectFolder();
                    if (folder) {
                      const newSettings = {
                        ...settings,
                        defaultInstallDirectory: folder,
                      };
                      setSettings(newSettings);
                      await (window as any).electron.updateSettings(
                        newSettings,
                      );
                    }
                  }}
                >
                  Change Folder
                </Button>
              </Group>
            </Stack>

            <Divider color="rgba(255,255,255,0.05)" />

            <Group justify="space-between">
              <Stack gap={0}>
                <Group gap="xs">
                  <IconArchive size={16} color="#ff006e" />
                  <Text size="sm" fw={500}>
                    Unpack RAR files after download
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Automatically extract multi-part RAR archives once the
                  download finishes.
                </Text>
              </Stack>
              <Switch
                checked={settings.unpackAfterDownload}
                onChange={(e) => handleToggleUnpack(e.currentTarget.checked)}
                color="pink"
                size="md"
              />
            </Group>
          </Stack>
        </Card>

        {/* Application Section */}
        <Card withBorder radius="lg" p="xl" bg="rgba(255, 255, 255, 0.02)">
          <Stack gap="md">
            <Group gap="xs">
              <IconDeviceGamepad2 size={20} color="#40c057" />
              <Text fw={700}>Application</Text>
            </Group>

            <Divider color="rgba(255,255,255,0.05)" />

            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="sm" fw={500}>
                  Close to tray
                </Text>
                <Text size="xs" c="dimmed">
                  Minimize to system tray instead of quitting when the window is
                  closed.
                </Text>
              </Stack>
              <Switch
                checked={settings.closeToTray}
                onChange={(e) =>
                  handleToggleSetting("closeToTray", e.currentTarget.checked)
                }
                color="green"
                size="md"
              />
            </Group>

            <Divider color="rgba(255,255,255,0.05)" />

            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="sm" fw={500}>
                  Run on startup
                </Text>
                <Text size="xs" c="dimmed">
                  Automatically start the application when you log in to your
                  computer.
                </Text>
              </Stack>
              <Switch
                checked={settings.runOnStartup}
                onChange={(e) =>
                  handleToggleSetting("runOnStartup", e.currentTarget.checked)
                }
                color="green"
                size="md"
              />
            </Group>

            <Divider color="rgba(255,255,255,0.05)" />

            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="sm" fw={500}>
                  Start minimized
                </Text>
                <Text size="xs" c="dimmed">
                  Start the application minimized in the system tray.
                </Text>
              </Stack>
              <Switch
                checked={settings.startMinimized}
                onChange={(e) =>
                  handleToggleSetting("startMinimized", e.currentTarget.checked)
                }
                color="green"
                size="md"
              />
            </Group>
          </Stack>
        </Card>

        {/* Notifications Section */}
        <Card withBorder radius="lg" p="xl" bg="rgba(255, 255, 255, 0.02)">
          <Stack gap="md">
            <Group gap="xs">
              <IconBell size={20} color="#f08c00" />
              <Text fw={700}>Notifications</Text>
            </Group>

            <Divider color="rgba(255,255,255,0.05)" />

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                New Repack Alerts
              </Text>
              <Text size="xs" c="dimmed">
                Choose which new releases you want to be notified about.
              </Text>
              <SegmentedControl
                value={settings.notificationMode || "all"}
                onChange={(val: any) =>
                  handleToggleSetting("notificationMode", val)
                }
                data={[
                  { label: "All Repacks", value: "all" },
                  { label: "My List Only", value: "library" },
                  { label: "Disabled", value: "disabled" },
                ]}
                color="orange"
                fullWidth
                mt="xs"
              />
            </Stack>
          </Stack>
        </Card>

        {/* Integrations Section */}
        <Card withBorder radius="lg" p="xl" bg="rgba(255, 255, 255, 0.02)">
          <Stack gap="md">
            <Group gap="xs">
              <IconDeviceGamepad2 size={20} color="#ff006e" />
              <Text fw={700}>Integrations</Text>
            </Group>

            <Divider color="rgba(255,255,255,0.05)" />

            <Stack gap={4}>
              <Text size="sm" fw={500}>
                DS4Windows Executable Path
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                Configure the path to DS4Windows to auto-launch it with your
                games.
              </Text>
              <Group>
                <TextInput
                  value={settings.ds4WindowsPath || ""}
                  placeholder="Not configured"
                  readOnly
                  flex={1}
                  styles={{ input: { backgroundColor: "rgba(0,0,0,0.2)" } }}
                />
                <Button variant="light" color="pink" onClick={handleSelectDS4}>
                  Browse
                </Button>
                {settings.ds4WindowsPath && (
                  <Button
                    variant="subtle"
                    color="red"
                    onClick={async () => {
                      const newSettings = { ...settings, ds4WindowsPath: "" };
                      setSettings(newSettings);
                      await (window as any).electron.updateSettings(
                        newSettings,
                      );
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Group>
            </Stack>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="xl" bg="rgba(255, 255, 255, 0.02)">
          <Text size="xs" c="dimmed" ta="center">
            FitGirl Repacks Manager Application Settings
          </Text>
        </Card>
      </Stack>
    </Container>
  );
}

function UserStatusSection() {
  const { user, logout, loading } = useAuth();
  const [opened, { open, close }] = useDisclosure();
  const router = useRouter();
  if (loading) return <Text size="sm">Loading account status...</Text>;

  if (!user) {
    return (
      <Stack gap="md">
        <Group gap="xs">
          <IconUser size={20} color="var(--mantine-color-blue-6)" />
          <Text fw={700}>Account</Text>
        </Group>
        <Divider color="rgba(255,255,255,0.05)" />
        <Text size="sm">You are not logged in.</Text>
        <Button
          variant="light"
          color="blue"
          onClick={() => ((window as any).location.href = "/")}
        >
          Go to Dashboard to Login
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <IconUser size={20} color="var(--mantine-color-blue-6)" />
          <Text fw={700}>Account Status</Text>
        </Group>
        <Badge
          color="blue"
          variant="filled"
          leftSection={<IconUser size={12} />}
        >
          Active Account
        </Badge>
      </Group>

      <Divider color="rgba(255,255,255,0.05)" />

      <Group justify="space-between" align="flex-start">
        <Stack gap={0}>
          <Text fw={600}>{user.user_metadata?.full_name || "User"}</Text>
          <Text size="xs" c="dimmed">
            {user.email}
          </Text>
        </Stack>
        <Button
          variant="subtle"
          color="red"
          size="xs"
          leftSection={<IconLogout size={14} />}
          onClick={logout}
        >
          Logout
        </Button>
      </Group>
    </Stack>
  );
}
