"use client";

import { Group, Tooltip, rem } from "@mantine/core";
import {
  IconBrandWindows,
  IconBrandXbox,
  IconDeviceNintendo,
  IconBrandApple,
  IconDeviceDesktop,
  IconDeviceGamepad,
  IconDeviceGamepad3,
  IconDeviceGamepad2,
} from "@tabler/icons-react";
import React from "react";

interface PlatformIconsProps {
  platforms?: { name: string }[];
  size?: number;
  limit?: number;
}

const getPlatformIcon = (name: string, size: number) => {
  const n = name.toLowerCase();
  if (n.includes("playstation") || n.includes("ps"))
    return <IconDeviceGamepad2 size={size} color="#003791" />;
  if (n.includes("xbox") || n.includes("xb"))
    return <IconBrandXbox size={size} color="#107C10" />;
  if (n.includes("nintendo") || n.includes("switch"))
    return <IconDeviceNintendo size={size} color="#E60012" />;
  if (n.includes("windows") || n.includes("pc"))
    return <IconBrandWindows size={size} color="#0078D4" />;
  if (n.includes("mac") || n.includes("apple"))
    return <IconBrandApple size={size} color="#A2AAAD" />;
  return <IconDeviceDesktop size={size} color="gray" />;
};

export function PlatformIcons({
  platforms = [],
  size = 18,
  limit = 10,
}: PlatformIconsProps) {
  if (!platforms || platforms.length === 0) return null;

  const displayed = platforms.slice(0, limit);
  const remaining = platforms.length - limit;

  return (
    <Group gap={6} wrap="nowrap">
      {displayed.map((p, i) => (
        <Tooltip key={i} label={p.name} position="bottom" withArrow>
          <div style={{ display: "flex", alignItems: "center" }}>
            {getPlatformIcon(p.name, size)}
          </div>
        </Tooltip>
      ))}
      {/* {remaining > 0 && (
        <Tooltip
          label={platforms
            .slice(limit)
            .map((p) => p.name)
            .join(", ")}
        >
          <span
            style={{ fontSize: rem(10), color: "var(--mantine-color-dimmed)" }}
          >
            +{remaining}
          </span>
        </Tooltip>
      )} */}
    </Group>
  );
}
