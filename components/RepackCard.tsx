"use client";

import React, { useState, memo, useMemo, useRef, useEffect } from "react";
import BorderGlow from "./border-glow";
import {
  Card,
  Image,
  Title,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  Tooltip,
  ActionIcon,
  Box,
  Center,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import {
  IconCheck,
  IconClock,
  IconEye,
  IconEyeOff,
  IconHeart,
  IconDeviceGamepad2,
  IconBookmark,
  IconDownload,
  IconSearch,
} from "@tabler/icons-react";
import { useInViewport } from "@mantine/hooks";
import { FitGirlRepack } from "../app/repacks/page";
import { ensureHttps } from "../lib/fitgirl";

interface RepackCardProps {
  repack: FitGirlRepack;
  isRead: boolean;
  igdbIdCache: Record<string, number>;
  userGames: Record<string, string[]>;
  onToggleRead: (e: React.MouseEvent, repack: FitGirlRepack) => void;
  onMarkOlderAsRead: (e: React.MouseEvent, repack: FitGirlRepack) => void;
  onToggleStatus: (
    e: React.MouseEvent,
    postID: string,
    title: string,
    status: string,
  ) => void;
  onClick: (repack: FitGirlRepack) => void;
}

export const RepackCard = memo(
  ({
    repack,
    isRead,
    igdbIdCache,
    userGames,
    onToggleRead,
    onMarkOlderAsRead,
    onToggleStatus,
    onClick,
  }: RepackCardProps) => {
    const { ref, inViewport } = useInViewport();
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const repackMedia = useMemo(
      () =>
        (repack.Media || [])
          .filter((m) => m.url !== repack.CoverImage)
          .sort((a, b) => (a.type === "video" ? -1 : 1)),
      [repack.Media, repack.CoverImage],
    );

    // Play/Pause video based on hover and viewport
    useEffect(() => {
      if (videoRef.current) {
        if (isHovered && inViewport) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      }
    }, [isHovered, inViewport]);

    return (
      <BorderGlow
        edgeSensitivity={30}
        glowColor="40 80 80"
        backgroundColor="#120F17"
        borderRadius={12}
        glowRadius={40}
        glowIntensity={1}
        coneSpread={25}
        animated={false}
        colors={["#c084fc", "#f472b6", "#38bdf8"]}
      >
        <Card
          ref={ref}
          key={repack.PostID}
          withBorder={false}
          radius="lg"
          p={0}
          bg="var(--mantine-color-dark-8)"
          style={{
            overflow: "hidden",
            transition:
              "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "transform",
            transform: "translateZ(0)",
            border: "none",
            cursor: "pointer",
            borderRadius: 12,
          }}
          className="repack-row-card"
          onClick={() => onClick(repack)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Group wrap="nowrap" align="stretch" gap={0}>
            {/* Cover Section */}
            <Box
              style={{
                width: 200,
                minWidth: 200,
                position: "relative",
                borderRight: "1px solid var(--mantine-color-dark-5)",
              }}
            >
              <Image
                src={ensureHttps(repack.CoverImage)}
                alt={repack.PostTitle}
                height={280}
                fit="cover"
                fallbackSrc="https://placehold.co/200x280?text=No+Cover"
              />

              {/* Overlays */}
              <Box
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  zIndex: 10,
                }}
              >
                <Stack gap={8} align="flex-start">
                  {!isRead && (
                    <Badge
                      variant="filled"
                      color="blue.6"
                      size="lg"
                      radius="sm"
                      style={{
                        boxShadow: "0 0 15px rgba(34, 139, 230, 0.5)",
                        fontWeight: 900,
                      }}
                    >
                      NEW
                    </Badge>
                  )}

                  {repack.Genres?.includes("HYPERVISOR") && (
                    <Badge
                      variant="filled"
                      color="red.7"
                      size="xl"
                      radius="sm"
                      style={{
                        boxShadow: "0 0 25px rgba(230, 34, 60, 0.7)",
                        fontWeight: 950,
                        letterSpacing: 1.5,
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      HYPERVISOR
                    </Badge>
                  )}
                </Stack>
              </Box>

              <Box
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  zIndex: 10,
                }}
              >
                <Group gap={8}>
                  <Tooltip label="Mark this and all older as read">
                    <ActionIcon
                      variant="filled"
                      color="dark.4"
                      onClick={(e) => onMarkOlderAsRead(e, repack)}
                      size="lg"
                      radius="md"
                      style={{
                        backgroundColor: "rgba(26, 27, 30, 0.9)",
                      }}
                    >
                      <Stack gap={0} align="center">
                        <IconCheck size={16} />
                        <IconClock size={10} style={{ marginTop: -4 }} />
                      </Stack>
                    </ActionIcon>
                  </Tooltip>

                  <ActionIcon
                    variant="filled"
                    color={isRead ? "dark.4" : "blue.6"}
                    onClick={(e) => onToggleRead(e, repack)}
                    size="lg"
                    radius="md"
                    style={{
                      backgroundColor: isRead
                        ? "rgba(26, 27, 30, 0.9)"
                        : "rgba(34, 139, 230, 0.95)",
                    }}
                  >
                    {isRead ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </ActionIcon>
                </Group>
              </Box>

              {/* Sizes Overlay */}
              <Box
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "30px 14px 14px",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
                  zIndex: 5,
                }}
              >
                <Stack gap={4}>
                  <Group justify="space-between" gap={4}>
                    <Text size="xs" c="cyan.4" fw={800} tt="uppercase" lts={1}>
                      Repack
                    </Text>
                    <Badge
                      color="cyan.8"
                      variant="filled"
                      size="sm"
                      radius="sm"
                    >
                      {repack.PostFileRepackSize}
                    </Badge>
                  </Group>
                  <Group justify="space-between" gap={4}>
                    <Text size="xs" c="gray.5" fw={800} tt="uppercase" lts={1}>
                      Original
                    </Text>
                    <Text size="xs" c="white" fw={800}>
                      {repack.PostFileOriginalSize}
                    </Text>
                  </Group>
                </Stack>
              </Box>
            </Box>

            {/* Content Section */}
            <Box
              style={{
                flex: 1,
                backgroundColor: "var(--mantine-color-dark-7)",
              }}
            >
              <Stack gap={0} h="100%">
                {/* Screenshots Carousel - Only rendered when in viewport for performance */}
                <Box
                  style={{
                    height: 180,
                    position: "relative",
                    backgroundColor: "#000",
                  }}
                >
                  {inViewport ? (
                    <Carousel
                      withControls={repackMedia.length > 0}
                      withIndicators={repackMedia.length > 0}
                      slideSize="50%"
                      styles={{
                        root: { height: "100%" },
                        viewport: { height: "100%" },
                        container: { height: "100%" },
                        control: {
                          backgroundColor: "rgba(0,0,0,0.7)",
                          border: "none",
                          color: "white",
                        },
                        indicator: {
                          width: 10,
                          height: 4,
                          transition: "width 250ms ease",
                          "&[dataActive]": {
                            width: 30,
                            backgroundColor: "var(--mantine-color-blue-5)",
                          },
                        },
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {repackMedia.length > 0 ? (
                        repackMedia.map((media, idx) => (
                          <Carousel.Slide key={idx}>
                            {media.type === "video" ? (
                              <video
                                ref={idx === 0 ? videoRef : null}
                                src={media.url}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                muted
                                loop
                                playsInline
                              />
                            ) : (
                              <Image
                                alt={repack.PostTitle}
                                src={media.url}
                                height="100%"
                                fit="cover"
                              />
                            )}
                          </Carousel.Slide>
                        ))
                      ) : (
                        <Carousel.Slide>
                          <Center h="100%" bg="dark.7">
                            <IconDeviceGamepad2 size={40} opacity={0.1} />
                          </Center>
                        </Carousel.Slide>
                      )}
                    </Carousel>
                  ) : (
                    <Center h="100%" bg="dark.9">
                      <IconDeviceGamepad2 size={40} opacity={0.05} />
                    </Center>
                  )}
                </Box>

                {/* Text Content */}
                <Box
                  p="lg"
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                    mb="sm"
                  >
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Title
                        order={2}
                        size="h3"
                        style={{ lineHeight: 1.1, letterSpacing: -0.5 }}
                      >
                        {repack.PostTitle}
                      </Title>
                      <Group gap={6}>
                        <IconClock
                          size={12}
                          color="var(--mantine-color-dark-3)"
                        />
                        <Text size="xs" c="dimmed" fw={500}>
                          {new Date(repack.Timestamp).toLocaleDateString(
                            undefined,
                            {
                              dateStyle: "long",
                            },
                          )}
                        </Text>
                      </Group>
                    </Stack>

                    <Group gap={6}>
                      {(
                        [
                          {
                            status: "favorite",
                            icon: IconHeart,
                            color: "red",
                            label: "Favorite",
                          },
                          {
                            status: "playing",
                            icon: IconDeviceGamepad2,
                            color: "blue",
                            label: "Playing",
                          },
                          {
                            status: "completed",
                            icon: IconCheck,
                            color: "green",
                            label: "Completed",
                          },
                          {
                            status: "wishlist",
                            icon: IconBookmark,
                            color: "orange",
                            label: "Wishlist",
                          },
                          {
                            status: "downloaded",
                            icon: IconDownload,
                            color: "cyan",
                            label: "Downloaded",
                          },
                        ] as const
                      ).map(({ status, icon: Icon, color, label }) => {
                        const cachedIgdbId = igdbIdCache[repack.PostID];
                        const active = cachedIgdbId
                          ? (userGames[cachedIgdbId] || []).includes(status)
                          : false;
                        return (
                          <Tooltip key={status} label={label}>
                            <ActionIcon
                              variant={active ? "filled" : "light"}
                              color={active ? color : "dark.4"}
                              size="lg"
                              radius="md"
                              onClick={(e) =>
                                onToggleStatus(
                                  e,
                                  repack.PostID,
                                  repack.PostTitle,
                                  status,
                                )
                              }
                              style={{ transition: "all 0.2s ease" }}
                            >
                              <Icon size={18} />
                            </ActionIcon>
                          </Tooltip>
                        );
                      })}
                    </Group>
                  </Group>

                  <Group gap={6} mb="md" wrap="wrap">
                    {repack.Genres &&
                      repack.Genres.slice(0, 6).map((genre, idx) => (
                        <Badge
                          key={idx}
                          variant="dot"
                          color="blue.4"
                          size="xs"
                          radius="xs"
                          style={{ textTransform: "none" }}
                        >
                          {genre}
                        </Badge>
                      ))}
                  </Group>

                  <Group justify="space-between" align="flex-end" mt="auto">
                    <Box style={{ maxWidth: "65%" }}>
                      {repack.Companies && (
                        <Text size="sm" c="blue.2" fw={700} lineClamp={1}>
                          {repack.Companies}
                        </Text>
                      )}
                      {repack.Languages && (
                        <Text size="xs" c="dimmed" lineClamp={1} fw={500}>
                          {repack.Languages}
                        </Text>
                      )}
                    </Box>

                    <Button
                      variant="light"
                      color="blue"
                      size="md"
                      radius="md"
                      rightSection={<IconSearch size={18} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        (window as any).electron.openExternal(repack.PostLink);
                      }}
                      styles={{
                        root: {
                          backgroundColor: "rgba(34, 139, 230, 0.1)",
                          "&:hover": {
                            backgroundColor: "rgba(34, 139, 230, 0.2)",
                          },
                        },
                      }}
                    >
                      Details
                    </Button>
                  </Group>
                </Box>
              </Stack>
            </Box>
          </Group>
        </Card>
      </BorderGlow>
    );
  },
);
