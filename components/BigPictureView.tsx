"use client";

import {
  Box,
  Center,
  Image,
  Text,
  Title,
  Stack,
  Group,
  Loader,
  Transition,
  ActionIcon,
  SimpleGrid,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { useHotkeys } from "@mantine/hooks";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  IconPlayerPlay,
  IconX,
  IconSettings,
  IconClock,
  IconStar,
  IconCalendar,
  IconUsers,
} from "@tabler/icons-react";
import { Game, IgdbService } from "../lib/igdb";
import { useUserData } from "../lib/useUserData";
import { PlatformIcons } from "./PlatformIcons";
import { Badge, Divider, ScrollArea } from "@mantine/core";
import { useRouter } from "next/navigation";

interface BigPictureViewProps {
  onClose: () => void;
}

export function BigPictureView({ onClose }: BigPictureViewProps) {
  const { userData, loading: userDataLoading } = useUserData();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [focusArea, setFocusArea] = useState<"header" | "carousel" | "details">(
    "carousel",
  );
  const [headerIndex, setHeaderIndex] = useState(1);
  const [detailsSubFocus, setDetailsSubFocus] = useState<
    "info" | "screenshots" | "trailers"
  >("info");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const carouselRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const screenshotsRef = useRef<HTMLDivElement>(null);
  const trailersRef = useRef<HTMLDivElement>(null);
  const lastGamepadAction = useRef<number>(0);
  const gamepadPollingRef = useRef<number>(0);

  const activeGame = games[activeIndex];

  useEffect(() => {
    if (userDataLoading || !userData) return;

    const gameIds = Object.keys(userData.userGames || {}).map(Number);
    if (gameIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchLibrary = async () => {
      try {
        const metadata = await IgdbService.getGamesByIds(gameIds);
        const virtualGames = Object.values(userData.virtualGames || {});
        const allGames = [...metadata, ...virtualGames];

        const filteredGames = allGames.filter((g) => g && g.name);

        const lastPlayed = userData.lastPlayedTimestamps || {};
        const gamePaths = userData.gamePaths || {};
        const userGames = userData.userGames || {};

        filteredGames.sort((a, b) => {
          const pathA = gamePaths[a.id];
          const pathB = gamePaths[b.id];

          if (pathA && !pathB) return -1;
          if (!pathA && pathB) return 1;

          if (pathA && pathB) {
            const tsA = lastPlayed[a.id] || 0;
            const tsB = lastPlayed[b.id] || 0;
            if (tsA !== tsB) return tsB - tsA;
          } else {
            const statusA = userGames[a.id] || [];
            const statusB = userGames[b.id] || [];

            const getPriority = (statuses: string[]) => {
              if (statuses.includes("downloaded")) return 3;
              if (statuses.includes("wishlist")) return 2;
              return 1;
            };

            const priA = getPriority(statusA);
            const priB = getPriority(statusB);

            if (priA !== priB) return priB - priA;
          }

          const dateA = a.first_release_date || 0;
          const dateB = b.first_release_date || 0;
          if (dateA !== dateB) return dateB - dateA;

          return a.name.localeCompare(b.name);
        });

        setGames(filteredGames);
      } catch (error) {
        console.error("Failed to fetch library metadata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, [userData, userDataLoading]);

  const handleLaunch = () => {
    if (activeGame && userData?.gamePaths?.[activeGame.id]) {
      (window as any).electron.launchGame(userData.gamePaths[activeGame.id]);
    } else {
      setShowDetails(true);
    }
  };

  const handleRight = () => {
    if (focusArea === "header") setHeaderIndex((prev) => (prev + 1) % 2);
    else if (focusArea === "carousel") {
      if (activeIndex < Math.min(games.length, displayLimit) - 1) {
        setActiveIndex((prev) => prev + 1);
        setShowDetails(false);
        setDetailsSubFocus("info");
        setMediaIndex(0);
      } else if (
        activeIndex === displayLimit - 1 &&
        games.length > displayLimit
      ) {
        setActiveIndex(displayLimit);
      }
    } else if (focusArea === "details") {
      if (detailsSubFocus === "screenshots") {
        const count = activeGame?.screenshots?.length || 0;
        setMediaIndex((prev) => Math.min(prev + 1, count - 1));
      } else if (detailsSubFocus === "trailers") {
        const count = activeGame?.videos?.length || 0;
        setMediaIndex((prev) => Math.min(prev + 1, count - 1));
      }
    }
  };

  const handleLeft = () => {
    if (focusArea === "header") setHeaderIndex((prev) => (prev - 1 + 2) % 2);
    else if (focusArea === "carousel") {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      setShowDetails(false);
      setDetailsSubFocus("info");
      setMediaIndex(0);
    } else if (focusArea === "details") {
      setMediaIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleDown = () => {
    if (focusArea === "header") {
      setFocusArea("carousel");
    } else if (focusArea === "carousel") {
      if (!showDetails) setShowDetails(true);
      else setFocusArea("details");
    } else if (focusArea === "details") {
      if (detailsSubFocus === "info") {
        if (activeGame?.screenshots?.length) setDetailsSubFocus("screenshots");
        else if (activeGame?.videos?.length) setDetailsSubFocus("trailers");
        setMediaIndex(0);
      } else if (detailsSubFocus === "screenshots") {
        if (activeGame?.videos?.length) setDetailsSubFocus("trailers");
        setMediaIndex(0);
      } else {
        viewportRef.current?.scrollBy({ top: 150, behavior: "smooth" });
      }
    }
  };

  const handleUp = () => {
    if (focusArea === "details") {
      if (detailsSubFocus === "trailers") {
        if (activeGame?.screenshots?.length) setDetailsSubFocus("screenshots");
        else setDetailsSubFocus("info");
        setMediaIndex(0);
      } else if (detailsSubFocus === "screenshots") {
        setDetailsSubFocus("info");
        setMediaIndex(0);
        viewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setFocusArea("carousel");
      }
    } else if (focusArea === "carousel") {
      if (showDetails) {
        setShowDetails(false);
      } else {
        setFocusArea("header");
      }
    }
  };

  const handleEnter = () => {
    if (focusArea === "header") {
      if (headerIndex === 0) onClose();
      if (headerIndex === 1) {
        onClose();
        router.push("/settings");
      }
    } else if (focusArea === "carousel") {
      if (activeIndex === displayLimit) {
        setDisplayLimit((prev) => prev + 20);
      } else {
        handleLaunch();
      }
    } else if (focusArea === "details") {
      if (detailsSubFocus === "trailers" && activeGame?.videos?.[mediaIndex]) {
        setSelectedVideoId(activeGame.videos[mediaIndex].video_id);
      }
    }
  };

  const handleEsc = () => {
    if (selectedVideoId) {
      setSelectedVideoId(null);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      if (!gamepads) return;

      for (const gp of gamepads) {
        if (!gp) continue;

        const now = Date.now();
        if (now - lastGamepadAction.current < 200) continue;

        const threshold = 0.5;
        let actionTaken = false;

        if (gp.axes[1] < -threshold || gp.buttons[12]?.pressed) {
          handleUp();
          actionTaken = true;
        } else if (gp.axes[1] > threshold || gp.buttons[13]?.pressed) {
          handleDown();
          actionTaken = true;
        } else if (gp.axes[0] < -threshold || gp.buttons[14]?.pressed) {
          handleLeft();
          actionTaken = true;
        } else if (gp.axes[0] > threshold || gp.buttons[15]?.pressed) {
          handleRight();
          actionTaken = true;
        }

        if (gp.buttons[0]?.pressed) {
          handleEnter();
          actionTaken = true;
        } else if (gp.buttons[1]?.pressed || gp.buttons[9]?.pressed) {
          handleEsc();
          actionTaken = true;
        }

        if (actionTaken) {
          lastGamepadAction.current = now;
        }
      }
      gamepadPollingRef.current = requestAnimationFrame(pollGamepad);
    };

    gamepadPollingRef.current = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(gamepadPollingRef.current);
  }, [
    focusArea,
    activeIndex,
    detailsSubFocus,
    mediaIndex,
    showDetails,
    selectedVideoId,
    games,
    displayLimit,
    headerIndex,
  ]);

  useHotkeys([
    ["ArrowRight", handleRight],
    ["ArrowLeft", handleLeft],
    ["ArrowDown", handleDown],
    ["ArrowUp", handleUp],
    ["Enter", handleEnter],
    ["Escape", handleEsc],
  ]);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo(activeIndex);
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!viewportRef.current || focusArea !== "details") return;

    let targetTop = 0;
    if (detailsSubFocus === "screenshots") targetTop = 400;
    if (detailsSubFocus === "trailers") targetTop = 800;

    viewportRef.current.scrollTo({ top: targetTop, behavior: "smooth" });
  }, [detailsSubFocus, focusArea]);

  useEffect(() => {
    const ref =
      detailsSubFocus === "screenshots" ? screenshotsRef : trailersRef;
    if (!ref.current || focusArea !== "details") return;

    const activeItem = ref.current.children[mediaIndex] as HTMLElement;
    if (activeItem) {
      const containerWidth = ref.current.offsetWidth;
      const itemWidth = activeItem.offsetWidth;
      const targetScroll =
        activeItem.offsetLeft - containerWidth / 2 + itemWidth / 2;

      ref.current.scrollTo({ left: targetScroll, behavior: "smooth" });
    }
  }, [mediaIndex, detailsSubFocus, focusArea]);

  if (loading) {
    return (
      <Box pos="fixed" inset={0} style={{ zIndex: 10000, background: "#000" }}>
        <Center h="100%">
          <Stack align="center">
            <Loader size="xl" color="blue" />
            <Text c="white" fw={500}>
              Entering Big Picture Mode...
            </Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  const backgroundImage =
    activeGame?.screenshots?.[0]?.url?.replace("t_thumb", "t_1080p") ||
    activeGame?.cover?.url?.replace("t_thumb", "t_1080p") ||
    "";

  return (
    <Box
      pos="fixed"
      inset={0}
      style={{
        zIndex: 10000,
        background: "#000",
        overflow: "hidden",
        color: "white",
      }}
    >
      {/* Background Image with Blur/Dim */}
      <Box
        pos="absolute"
        inset={0}
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 0.5s ease-in-out",
          filter: "blur(20px) brightness(0.4)",
          transform: "scale(1.1)",
        }}
      />

      {/* Main Content Container Layer for Focus Transitions */}
      <Box
        pos="relative"
        h="100%"
        w="100%"
        style={{
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          transform:
            focusArea === "details"
              ? "translateY(-0%)"
              : focusArea === "header"
                ? "translateY(5%)"
                : "translateY(0)",
          zIndex: 1,
        }}
      >
        <Stack h="100%" justify="space-between" p="xl">
          {/* Top Header */}
          <Group
            justify="space-between"
            align="center"
            style={{
              transition: "opacity 0.4s ease, transform 0.4s ease",
              opacity: focusArea === "details" ? 0 : 1,
              transform: focusArea === "header" ? "translateY(-10px)" : "none",
              paddingTop: 20,
              zIndex: 100,
              position: "relative",
            }}
          >
            <Group gap="xl">
              <Title
                order={2}
                style={{ fontFamily: "var(--font-outfit)", letterSpacing: 2 }}
              >
                FitGirl Manager
              </Title>
              <Group gap="xs" c="dimmed">
                <IconClock size={20} />
                <Text fw={500}>
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Group>
            </Group>

            <Group gap="md">
              <ActionIcon
                variant={
                  focusArea === "header" && headerIndex === 1
                    ? "filled"
                    : "subtle"
                }
                color={
                  focusArea === "header" && headerIndex === 1 ? "blue" : "white"
                }
                size="xl"
                style={{
                  border:
                    focusArea === "header" && headerIndex === 1
                      ? "2px solid white"
                      : "none",
                  boxShadow:
                    focusArea === "header" && headerIndex === 1
                      ? "0 0 15px rgba(255,255,255,0.4)"
                      : "none",
                  transition: "all 0.2s ease",
                }}
                onClick={() => {
                  onClose();
                  router.push("/settings");
                }}
              >
                <IconSettings size={28} />
              </ActionIcon>
              <ActionIcon
                variant={
                  focusArea === "header" && headerIndex === 0
                    ? "filled"
                    : "subtle"
                }
                color="red"
                size="xl"
                onClick={onClose}
                style={{
                  border:
                    focusArea === "header" && headerIndex === 0
                      ? "2px solid white"
                      : "none",
                  boxShadow:
                    focusArea === "header" && headerIndex === 0
                      ? "0 0 15px rgba(255,0,0,0.3)"
                      : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <IconX size={28} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Carousel Section */}
          <Box
            h={showDetails ? "20%" : "40%"}
            display="flex"
            style={{
              alignItems: "center",
              transition: "height 0.4s ease",
              padding: "60px 0",
            }}
          >
            <Carousel
              getEmblaApi={(api) => (carouselRef.current = api)}
              slideSize="180px"
              slideGap="xl"
              withControls={false}
              initialSlide={activeIndex}
              style={{ width: "100%", overflow: "visible" }}
              styles={{
                viewport: { overflow: "visible" },
                container: { overflow: "visible" },
              }}
              emblaOptions={{
                align: "center",
                loop: false,
              }}
            >
              {games.slice(0, displayLimit).map((game, index) => (
                <Carousel.Slide key={game.id}>
                  <Box
                    onClick={() => setActiveIndex(index)}
                    style={{
                      cursor: "pointer",
                      transition:
                        "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                      transform:
                        activeIndex === index
                          ? "scale(1.4) translateY(-10px)"
                          : "scale(1)",
                      opacity: activeIndex === index ? 1 : 0.6,
                      border:
                        activeIndex === index
                          ? "2px solid rgba(255,255,255,0.8)"
                          : "2px solid transparent",
                      borderRadius: "12px",
                      overflow: "hidden",
                      aspectRatio: "1/1",
                      boxShadow:
                        activeIndex === index
                          ? "0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.2)"
                          : "none",
                    }}
                  >
                    <Image
                      src={game.cover?.url?.replace("t_thumb", "t_cover_big")}
                      alt={game.name}
                      h="100%"
                      fit="cover"
                    />
                  </Box>
                </Carousel.Slide>
              ))}

              {games.length > displayLimit && (
                <Carousel.Slide key="show-more">
                  <Box
                    onClick={() => {
                      setDisplayLimit((prev) => prev + 20);
                      setActiveIndex(displayLimit);
                    }}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.4s ease",
                      transform:
                        activeIndex === displayLimit
                          ? "scale(1.4) translateY(-10px)"
                          : "scale(1)",
                      opacity: activeIndex === displayLimit ? 1 : 0.6,
                      border:
                        activeIndex === displayLimit
                          ? "2px solid white"
                          : "2px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      aspectRatio: "1/1",
                      background: "rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Stack align="center" gap={4}>
                      <Text fw={800} size="xl">
                        +{games.length - displayLimit}
                      </Text>
                      <Text size="xs" fw={700}>
                        SHOW MORE
                      </Text>
                    </Stack>
                  </Box>
                </Carousel.Slide>
              )}
            </Carousel>
          </Box>

          {/* Bottom Info Section */}
          <Box px={100} pb={40} style={{ zIndex: 10 }}>
            <Transition
              mounted={!!activeGame}
              transition="fade"
              duration={400}
              timingFunction="ease"
            >
              {(styles) => (
                <Stack gap="xs" style={styles}>
                  <Title
                    order={1}
                    size={showDetails ? 48 : 64}
                    style={{
                      textShadow: "0 4px 10px rgba(0,0,0,0.5)",
                      transition: "all 0.4s ease",
                    }}
                  >
                    {activeGame?.name}
                  </Title>

                  <Group gap="xl">
                    {userData?.gamePaths?.[activeGame?.id!] ? (
                      <Group gap={8}>
                        <IconPlayerPlay size={24} fill="white" />
                        <Text size="xl" fw={700}>
                          START
                        </Text>
                      </Group>
                    ) : (
                      <Group gap={8}>
                        <Text size="xl" fw={700} c="blue.4">
                          VIEW DETAILS
                        </Text>
                      </Group>
                    )}
                    <Text c="dimmed" size="lg">
                      Press ENTER to{" "}
                      {userData?.gamePaths?.[activeGame?.id!]
                        ? "Play"
                        : "Explore"}
                    </Text>
                    {!showDetails ? (
                      <Text c="dimmed" size="lg">
                        Press DOWN for Media
                      </Text>
                    ) : (
                      <Text c="dimmed" size="lg">
                        Press UP to Close Media
                      </Text>
                    )}
                  </Group>

                  {activeGame?.summary && !showDetails && (
                    <Text
                      lineClamp={2}
                      size="lg"
                      opacity={0.7}
                      maw={800}
                      mt="md"
                    >
                      {activeGame.summary}
                    </Text>
                  )}

                  {/* Details Section (Full Metadata) */}
                  <Transition
                    mounted={showDetails && !!activeGame}
                    transition="slide-up"
                    duration={400}
                  >
                    {(mediaStyles) => (
                      <Box
                        style={{
                          ...mediaStyles,
                          marginTop: 20,
                          height: showDetails ? 500 : 0,
                          transition:
                            "height 0.4s ease, opacity 0.4s ease, transform 0.4s ease",
                          overflow: "hidden",
                        }}
                      >
                        <ScrollArea
                          h={500}
                          scrollbarSize={6}
                          viewportRef={viewportRef}
                        >
                          <Stack gap="xl" pr="md" pb={100}>
                            {/* Top Meta Info */}
                            <Group gap="xl">
                              {activeGame?.first_release_date && (
                                <Group gap={8}>
                                  <IconCalendar size={20} color="gray" />
                                  <Text size="lg" fw={600}>
                                    {new Date(
                                      activeGame.first_release_date * 1000,
                                    ).getFullYear()}
                                  </Text>
                                </Group>
                              )}
                              {activeGame?.total_rating && (
                                <Group gap={8}>
                                  <IconStar
                                    size={20}
                                    color="yellow"
                                    fill="yellow"
                                  />
                                  <Text size="lg" fw={800} c="yellow">
                                    {Math.round(activeGame.total_rating)}%
                                  </Text>
                                </Group>
                              )}
                              <Group gap={8}>
                                <IconUsers size={20} color="gray" />
                                <Text size="lg" fw={600} c="dimmed">
                                  {activeGame?.involved_companies?.find(
                                    (c) => c.developer,
                                  )?.company.name || "Unknown Developer"}
                                </Text>
                              </Group>
                            </Group>

                            <Divider opacity={0.1} />

                            <SimpleGrid cols={2} spacing="xl">
                              <Stack gap="md">
                                <Text fw={700} size="xl" c="dimmed">
                                  GENRES
                                </Text>
                                <Group gap={8}>
                                  {activeGame?.genres?.map((g) => (
                                    <Badge
                                      key={g.name}
                                      variant="dot"
                                      color="gray"
                                      size="lg"
                                    >
                                      {g.name}
                                    </Badge>
                                  ))}
                                </Group>
                              </Stack>
                              <Stack gap="md">
                                <Text fw={700} size="xl" c="dimmed">
                                  PLATFORMS
                                </Text>
                                <PlatformIcons
                                  platforms={activeGame?.platforms}
                                  size={24}
                                  limit={10}
                                />
                              </Stack>
                            </SimpleGrid>

                            {(activeGame?.storyline || activeGame?.summary) && (
                              <Box>
                                <Text fw={700} size="xl" mb="md" c="dimmed">
                                  ABOUT
                                </Text>
                                <Text
                                  size="lg"
                                  opacity={0.8}
                                  style={{ lineHeight: 1.6 }}
                                >
                                  {activeGame.storyline || activeGame.summary}
                                </Text>
                              </Box>
                            )}

                            {activeGame?.screenshots &&
                              activeGame.screenshots.length > 0 && (
                                <Box>
                                  <Text
                                    fw={700}
                                    size="xl"
                                    mb="md"
                                    c={
                                      detailsSubFocus === "screenshots"
                                        ? "white"
                                        : "dimmed"
                                    }
                                    style={{ transition: "color 0.2s" }}
                                  >
                                    SCREENSHOTS
                                  </Text>
                                  <Group
                                    gap="md"
                                    px={"md"}
                                    wrap="nowrap"
                                    ref={screenshotsRef}
                                    style={{
                                      overflowX: "hidden",
                                      padding: "20px 0",
                                      scrollBehavior: "smooth",
                                    }}
                                  >
                                    {activeGame.screenshots.map((ss, i) => (
                                      <Image
                                        key={i}
                                        src={ss.url.replace(
                                          "t_thumb",
                                          "t_720p",
                                        )}
                                        h={250}
                                        radius="md"
                                        style={{
                                          border:
                                            detailsSubFocus === "screenshots" &&
                                            mediaIndex === i
                                              ? "4px solid white"
                                              : "2px solid rgba(255,255,255,0.1)",
                                          transform:
                                            detailsSubFocus === "screenshots" &&
                                            mediaIndex === i
                                              ? "scale(1.05)"
                                              : "scale(1)",
                                          transition: "all 0.2s ease",
                                          boxShadow:
                                            detailsSubFocus === "screenshots" &&
                                            mediaIndex === i
                                              ? "0 0 20px rgba(255,255,255,0.3)"
                                              : "none",
                                        }}
                                      />
                                    ))}
                                  </Group>
                                </Box>
                              )}

                            {activeGame?.videos &&
                              activeGame.videos.length > 0 && (
                                <Box>
                                  <Text
                                    fw={700}
                                    size="xl"
                                    mb="md"
                                    c={
                                      detailsSubFocus === "trailers"
                                        ? "white"
                                        : "dimmed"
                                    }
                                    style={{ transition: "color 0.2s" }}
                                  >
                                    TRAILERS
                                  </Text>
                                  <Group
                                    px={"md"}
                                    gap="md"
                                    wrap="nowrap"
                                    ref={trailersRef}
                                    style={{
                                      overflowX: "hidden",
                                      padding: "20px 0",
                                      scrollBehavior: "smooth",
                                    }}
                                  >
                                    {activeGame.videos.map((vid, i) => (
                                      <Box
                                        key={i}
                                        style={{
                                          width: 600,
                                          aspectRatio: "16/9",
                                          position: "relative",
                                          borderRadius: "16px",
                                          overflow: "hidden",
                                          cursor: "pointer",
                                          border:
                                            detailsSubFocus === "trailers" &&
                                            mediaIndex === i
                                              ? "4px solid white"
                                              : "2px solid rgba(255,255,255,0.1)",
                                          transform:
                                            detailsSubFocus === "trailers" &&
                                            mediaIndex === i
                                              ? "scale(1.05)"
                                              : "scale(1)",
                                          transition: "all 0.2s ease",
                                          boxShadow:
                                            detailsSubFocus === "trailers" &&
                                            mediaIndex === i
                                              ? "0 0 20px rgba(255,255,255,0.3)"
                                              : "none",
                                        }}
                                        onClick={() => {
                                          setSelectedVideoId(vid.video_id);
                                        }}
                                      >
                                        {/* Thumbnail Image */}
                                        <Image
                                          src={`https://img.youtube.com/vi/${vid.video_id}/hqdefault.jpg`}
                                          pos="absolute"
                                          inset={0}
                                          style={{
                                            objectFit: "cover",
                                            opacity: 0.8,
                                          }}
                                        />

                                        {/* Overlay Content */}
                                        <Stack
                                          align="center"
                                          gap={4}
                                          pos="relative"
                                          style={{
                                            height: "100%",
                                            justifyContent: "center",
                                            background:
                                              "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                                          }}
                                        >
                                          <IconPlayerPlay
                                            size={60}
                                            fill="white"
                                            opacity={
                                              detailsSubFocus === "trailers" &&
                                              mediaIndex === i
                                                ? 1
                                                : 0.5
                                            }
                                          />
                                          <Text
                                            size="sm"
                                            truncate
                                            maw={400}
                                            fw={
                                              detailsSubFocus === "trailers" &&
                                              mediaIndex === i
                                                ? 700
                                                : 400
                                            }
                                          >
                                            {vid.name}
                                          </Text>
                                        </Stack>
                                      </Box>
                                    ))}
                                  </Group>
                                </Box>
                              )}
                          </Stack>
                        </ScrollArea>
                      </Box>
                    )}
                  </Transition>
                </Stack>
              )}
            </Transition>
          </Box>
        </Stack>
      </Box>
      {/* PS5-like scanline/texture overlay */}
      <Box
        pos="absolute"
        inset={0}
        style={{
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))",
          backgroundSize: "100% 2px, 3px 100%",
          zIndex: 2,
          opacity: 0.1,
        }}
      />

      {/* Video Player Overlay */}
      <Transition mounted={!!selectedVideoId} transition="fade" duration={400}>
        {(playerStyles) => (
          <Box
            pos="fixed"
            inset={0}
            style={{
              ...playerStyles,
              zIndex: 1000,
              background: "rgba(0,0,0,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
            }}
            onClick={() => setSelectedVideoId(null)}
          >
            <Box
              style={{
                width: "100%",
                maxWidth: 1200,
                aspectRatio: "16/9",
                position: "relative",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 0 50px rgba(0,0,0,0.8)",
                border: "2px solid rgba(255,255,255,0.1)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              <ActionIcon
                pos="absolute"
                top={20}
                right={20}
                variant="filled"
                color="dark"
                radius="xl"
                size="xl"
                onClick={() => setSelectedVideoId(null)}
              >
                <IconX size={24} />
              </ActionIcon>
            </Box>

            <Text pos="absolute" bottom={20} c="dimmed" size="lg" fw={600}>
              Press ESC to Close Player
            </Text>
          </Box>
        )}
      </Transition>
    </Box>
  );
}
