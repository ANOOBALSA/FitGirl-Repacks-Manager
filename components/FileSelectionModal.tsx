import React, { useState } from "react";
import {
  Modal,
  Button,
  Checkbox,
  Stack,
  Text,
  Group,
  Badge,
  Box,
  ScrollArea,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { IconDownload, IconRefresh } from "@tabler/icons-react";

interface FileSelectionModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (selectedFiles: string[]) => void;
  mainFiles: string[];
  optionalFiles: string[];
  selectiveFiles: string[];
  repackSize?: string;
  partSizes?: Record<string, number>;
  onRescanFile?: (file: string) => Promise<void>;
  onRescanAll?: () => Promise<void>;
}

export function FileSelectionModal({
  opened,
  onClose,
  onConfirm,
  mainFiles,
  optionalFiles,
  selectiveFiles,
  repackSize,
  partSizes,
  onRescanFile,
  onRescanAll,
}: FileSelectionModalProps) {
  const [rescanningFiles, setRescanningFiles] = useState<Set<string>>(
    new Set(),
  );
  const [rescanningAll, setRescanningAll] = useState(false);
  const [selectedOptional, setSelectedOptional] = useState<string[]>(() =>
    optionalFiles.filter((f) => f.toLowerCase().includes("english")),
  );
  const [selectedSelective, setSelectedSelective] = useState<string[]>(() =>
    selectiveFiles.filter((f) => f.toLowerCase().includes("english")),
  );

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalSelectedBytes = React.useMemo(() => {
    let total = 0;
    mainFiles.forEach((f) => (total += partSizes?.[f] || 0));
    selectedOptional.forEach((f) => (total += partSizes?.[f] || 0));
    selectedSelective.forEach((f) => (total += partSizes?.[f] || 0));
    return total;
  }, [mainFiles, selectedOptional, selectedSelective, partSizes]);

  const mainFilesTotalSize = React.useMemo(() => {
    let total = 0;
    mainFiles.forEach((f) => (total += partSizes?.[f] || 0));
    return total;
  }, [mainFiles, partSizes]);

  const isLoadingSizes = React.useMemo(() => {
    const allSelected = [
      ...mainFiles,
      ...selectedOptional,
      ...selectedSelective,
    ];
    if (!partSizes || Object.keys(partSizes).length === 0)
      return allSelected.length > 0;

    return allSelected.some((f) => !(f in partSizes));
  }, [mainFiles, selectedOptional, selectedSelective, partSizes]);

  const handleConfirm = () => {
    onConfirm([...selectedOptional, ...selectedSelective]);
    onClose();
  };

  const toggleFile = (file: string, type: "optional" | "selective") => {
    const setter =
      type === "optional" ? setSelectedOptional : setSelectedSelective;
    const list = type === "optional" ? selectedOptional : selectedSelective;

    if (list.includes(file)) {
      setter(list.filter((f) => f !== file));
    } else {
      setter([...list, file]);
      if (onRescanFile && !(partSizes && file in partSizes)) {
        onRescanFile(file);
      }
    }
  };

  const renderFileRow = (
    file: string,
    isChecked: boolean,
    isDisabled: boolean,
    onToggle?: () => void,
  ) => {
    const fileName = file.includes("#")
      ? file.split("#")[1]
      : file.split("/").pop() || "File";
    const size = partSizes?.[file];
    const hasFetched = partSizes && file in partSizes;
    const isScanning = rescanningFiles.has(file);

    const handleRescanClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!onRescanFile) return;
      setRescanningFiles((prev) => new Set(prev).add(file));
      try {
        await onRescanFile(file);
      } finally {
        setRescanningFiles((prev) => {
          const next = new Set(prev);
          next.delete(file);
          return next;
        });
      }
    };

    return (
      <Checkbox
        key={file}
        label={
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" style={{ flex: 1 }}>
              {fileName}
            </Text>
            {hasFetched ? (
              <Group gap={4} wrap="nowrap">
                <Text size="xs" c={size && size > 0 ? "cyan" : "red"} fw={700}>
                  {size && size > 0 ? formatSize(size) : "Dead/NA"}
                </Text>
                {onRescanFile && (
                  <Tooltip label="Rescan Link">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="blue"
                      loading={isScanning}
                      onClick={handleRescanClick}
                    >
                      <IconRefresh size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            ) : (
              <Text size="xs" c="dimmed" fs="italic">
                checking...
              </Text>
            )}
          </Group>
        }
        checked={isChecked}
        disabled={isDisabled}
        onChange={onToggle}
        mb="xs"
      />
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Customize Download"
      size="lg"
      centered
      styles={{
        content: { backgroundColor: "#1a1b1e", color: "white" },
        header: { backgroundColor: "#1a1b1e", color: "white" },
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Box style={{ flex: 1 }}>
            <Text size="sm" c="dimmed">
              Select components to download. Required files are pre-checked.
            </Text>
          </Box>
          <Stack gap={4} align="flex-end">
            {isLoadingSizes ? (
              <Badge variant="light" color="blue" size="lg">
                Validating Mirrors...
              </Badge>
            ) : (
              <Group gap="sm">
                {onRescanAll && (
                  <Button
                    variant="light"
                    color="blue"
                    size="xs"
                    leftSection={<IconRefresh size={14} />}
                    loading={rescanningAll}
                    onClick={async () => {
                      setRescanningAll(true);
                      try {
                        await onRescanAll();
                      } finally {
                        setRescanningAll(false);
                      }
                    }}
                  >
                    Rescan Dead Links
                  </Button>
                )}
                <Badge variant="filled" color="pink" size="lg">
                  Actual Selection: {formatSize(totalSelectedBytes)}
                </Badge>
              </Group>
            )}
          </Stack>
        </Group>

        <ScrollArea h={450} pr="md">
          <Stack gap="xs">
            {/* Main Files - Individual List */}
            {mainFiles.length > 0 && (
              <Box mb="sm">
                <Text fw={700} size="sm" mb="xs" c="blue.4">
                  Main Files (Required)
                </Text>
                {mainFiles.map((file) => renderFileRow(file, true, true))}
              </Box>
            )}

            {/* Optional Files */}
            {optionalFiles.length > 0 && (
              <Box mb="sm">
                <Text fw={700} size="sm" mb="xs" c="pink.4">
                  Optional Files
                </Text>
                {optionalFiles.map((file) =>
                  renderFileRow(
                    file,
                    selectedOptional.includes(file),
                    false,
                    () => toggleFile(file, "optional"),
                  ),
                )}
              </Box>
            )}

            {/* Selective Files */}
            {selectiveFiles.length > 0 && (
              <Box mb="sm">
                <Text fw={700} size="sm" mb="xs" c="cyan.4">
                  Selective Files
                </Text>
                {selectiveFiles.map((file) =>
                  renderFileRow(
                    file,
                    selectedSelective.includes(file),
                    false,
                    () => toggleFile(file, "selective"),
                  ),
                )}
              </Box>
            )}
          </Stack>
        </ScrollArea>

        <Group
          justify="space-between"
          pt="md"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Text size="xs" c="dimmed" fw={700}>
            Estimate: {repackSize}
          </Text>
          <Group gap="xs">
            <Button variant="subtle" onClick={onClose} color="gray">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              color="pink"
              size="md"
              loading={isLoadingSizes}
              leftSection={<IconDownload size={18} />}
            >
              Start Download {formatSize(totalSelectedBytes)}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
