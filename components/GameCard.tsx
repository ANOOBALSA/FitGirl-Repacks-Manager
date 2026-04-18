"use client";

import {
  Card,
  Image,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  Tooltip,
  ActionIcon,
  Box,
  Loader,
  Center,
} from "@mantine/core";
import React, { useState, useEffect } from "react";
import {
  IconHeart,
  IconCheck,
  IconDeviceGamepad2,
  IconDownload,
  IconBookmark,
  IconTrophy,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { PlatformIcons } from "./PlatformIcons";
import { Game } from "../lib/igdb";
import fitgirlService from "../lib/fitgirl";

interface GameCardProps {
  game: Game;
  onStatusChange: (gameId: number, status: string) => void;
  onClick: (gameId: number) => void;
  onPlay?: (exePath: string) => void;
  exePath?: string;
  isDs4Enabled?: boolean;
  onDs4Toggle?: (gameId: number, enabled: boolean) => void;
  showDs4Toggle?: boolean;
  playTime?: number;
  isLauncherDisabled?: boolean;
  currentStatuses?: string[];
}

export function GameCard({
  game,
  onStatusChange,
  onClick,
  onPlay,
  exePath,
  isDs4Enabled,
  onDs4Toggle,
  showDs4Toggle,
  playTime,
  isLauncherDisabled,
  currentStatuses = [],
}: GameCardProps) {
  const [hasRepack, setHasRepack] = useState<boolean | null>(null);
  const coverUrl =
    game.cover?.url?.replace("t_thumb", "t_cover_big") ||
    "https://via.placeholder.com/264x352?text=No+Cover";

  useEffect(() => {
    const checkRepack = async () => {
      if (!currentStatuses.includes("wishlist")) {
        setHasRepack(false);
        return;
      }
      try {
        const result = await fitgirlService.searchForRepack(game.name);
        setHasRepack(Array.isArray(result) ? result.length > 0 : !!result);
      } catch (error) {
        setHasRepack(false);
      }
    };
    checkRepack();
  }, [game.name, currentStatuses]);

  const StatusIcon = ({
    status,
    active,
    onClick,
    icon: Icon,
    label,
    color,
  }: any) => (
    <Tooltip label={label}>
      <ActionIcon
        variant={active ? "filled" : "light"}
        color={active ? color : "gray"}
        onClick={() => onClick(game.id, status)}
        size="lg"
      >
        <Icon size={18} />
      </ActionIcon>
    </Tooltip>
  );

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        backgroundColor: "rgba(26, 27, 30, 0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: "rgba(255, 255, 255, 0.05)",
      }}
      onClick={() => onClick(game.id)}
      className="game-card-hover"
    >
      <Card.Section style={{ position: "relative" }}>
        <Image
          src={coverUrl}
          height={300}
          alt={game.name}
          fallbackSrc="https://via.placeholder.com/264x352?text=No+Cover"
        />
        {hasRepack && (
          <Badge
            color="green"
            variant="filled"
            style={{ position: "absolute", top: 10, right: 10, zIndex: 1 }}
            leftSection={<IconTrophy size={10} />}
          >
            FitGirl
          </Badge>
        )}
      </Card.Section>

      <Stack mt="md" mb="xs" style={{ flex: 1 }} gap="xs">
        <Text fw={700} lineClamp={1}>
          {game.name}
        </Text>

        <PlatformIcons platforms={game.platforms} size={14} />

        <Group gap={5} mt="auto">
          {game.total_rating && (
            <Badge color="blue" variant="light" size="sm">
              {Math.round(game.total_rating)}%
            </Badge>
          )}
          {game.first_release_date && (
            <Text size="xs" c="dimmed">
              {new Date(game.first_release_date * 1000).getFullYear()}
            </Text>
          )}
          {playTime && playTime > 0 && (
            <Text size="xs" c="dimmed" ml="auto" fw={500}>
              {(playTime / 60).toFixed(1)}h played
            </Text>
          )}
        </Group>
      </Stack>

      <Box
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ width: "100%" }}
      >
        <Group justify="space-between" mt="auto" gap={5}>
          {exePath && (
            <Group gap={5}>
              <Tooltip
                label={
                  isLauncherDisabled
                    ? "Another game is already running"
                    : "Play Game"
                }
              >
                <ActionIcon
                  variant="filled"
                  color="blue"
                  size="lg"
                  disabled={isLauncherDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay?.(exePath);
                  }}
                >
                  <IconPlayerPlayFilled size={18} />
                </ActionIcon>
              </Tooltip>
              {showDs4Toggle && (
                <Tooltip
                  label={
                    isDs4Enabled ? "DS4Windows Enabled" : "Enable DS4Windows"
                  }
                >
                  <ActionIcon
                    variant={isDs4Enabled ? "filled" : "light"}
                    color={isDs4Enabled ? "orange" : "gray"}
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDs4Toggle?.(game.id, !isDs4Enabled);
                    }}
                  >
                    <IconDeviceGamepad2 size={18} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          )}
          <StatusIcon
            status="favorite"
            active={currentStatuses.includes("favorite")}
            onClick={onStatusChange}
            icon={IconHeart}
            label="Favorite"
            color="red"
          />
          <StatusIcon
            status="playing"
            active={currentStatuses.includes("playing")}
            onClick={onStatusChange}
            icon={IconDeviceGamepad2}
            label="Currently Playing"
            color="blue"
          />
          <StatusIcon
            status="completed"
            active={currentStatuses.includes("completed")}
            onClick={onStatusChange}
            icon={IconCheck}
            label="Completed"
            color="green"
          />
          <StatusIcon
            status="wishlist"
            active={currentStatuses.includes("wishlist")}
            onClick={onStatusChange}
            icon={IconBookmark}
            label="Wishlist"
            color="orange"
          />
          {!exePath && (
            <StatusIcon
              status="downloaded"
              active={currentStatuses.includes("downloaded")}
              onClick={onStatusChange}
              icon={IconDownload}
              label="Downloaded"
              color="cyan"
            />
          )}
        </Group>
      </Box>
    </Card>
  );
}
