"use client";

import {
  Modal,
  Box,
  LoadingOverlay,
  ActionIcon,
  Group,
  Text,
  Button,
} from "@mantine/core";
import {
  IconExternalLink,
  IconX,
  IconMaximize,
  IconMinimize,
  IconArrowLeft,
  IconArrowRight,
  IconRotate,
  IconTools,
  IconPlayerPlay,
  IconBrandGoogle,
  IconMap,
} from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";

interface MapViewerProps {
  url: string;
  opened: boolean;
  onClose: () => void;
  gameName: string;
  onPlay?: () => void;
  isGameRunning?: boolean;
}

export function MapViewer({
  url,
  opened,
  onClose,
  gameName,
  onPlay,
  isGameRunning,
}: MapViewerProps) {
  const [preloadPath, setPreloadPath] = useState<string>("");
  const [currentUrl, setCurrentUrl] = useState(url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [webview, setWebview] = useState<any>(null);
  const webviewRef = useRef<any>(null);
  useEffect(() => {
    const fetchPreload = async () => {
      const path = await (window as any).electron.getMapGeniePreload();
      setPreloadPath(path);
    };
    fetchPreload();
  }, []);

  useEffect(() => {
    if (url) {
      setCurrentUrl(url);
    }
  }, [url]);

  useEffect(() => {
    if (webview) {
      const updateCanGoBackForward = () => {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
      };

      webview.addEventListener("did-navigate", updateCanGoBackForward);
      webview.addEventListener("did-navigate-in-page", updateCanGoBackForward);
      webview.addEventListener("did-finish-load", updateCanGoBackForward);

      return () => {
        webview.removeEventListener("did-navigate", updateCanGoBackForward);
        webview.removeEventListener(
          "did-navigate-in-page",
          updateCanGoBackForward,
        );
        webview.removeEventListener("did-finish-load", updateCanGoBackForward);
      };
    }
  }, [webview]);

  const handleGoBack = () => {
    if (webview && webview.canGoBack()) {
      webview.goBack();
    }
  };

  const handleGoForward = () => {
    if (webview && webview.canGoForward()) {
      webview.goForward();
    }
  };

  const handleRefresh = () => {
    if (webview) {
      webview.reload();
    }
  };

  const handleOpenDev = () => {
    if (webview) {
      webview.openDevTools();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      padding={0}
      fullScreen
      centered
      styles={{
        inner: { padding: 0 },
        content: {
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1a1b1e",
        },
        body: {
          padding: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Box
        style={{
          height: "50px",
          backgroundColor: "#25262b",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid #373A40",
          justifyContent: "space-between",
        }}
      >
        <Group>
          <Text fw={700} c="white">
            {gameName} - Interactive Map
          </Text>
          <Group gap={5} ml="xl">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleGoBack}
              disabled={!canGoBack}
              title="Go Back"
              size="lg"
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleGoForward}
              disabled={!canGoForward}
              title="Go Forward"
              size="lg"
            >
              <IconArrowRight size={20} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleRefresh}
              title="Refresh"
              size="lg"
            >
              <IconRotate size={20} />
            </ActionIcon>
          </Group>

          <Group
            gap={5}
            ml="xl"
            style={{
              backgroundColor: "#1A1B1E",
              padding: "4px",
              borderRadius: "8px",
            }}
          >
            <Button
              size="compact-sm"
              variant={currentUrl === url ? "filled" : "subtle"}
              color={currentUrl === url ? "blue" : "gray"}
              leftSection={<IconMap size={16} />}
              onClick={() => setCurrentUrl(url)}
            >
              Map
            </Button>
            <Button
              size="compact-sm"
              variant={
                currentUrl === "https://www.google.com" ? "filled" : "subtle"
              }
              color={currentUrl === "https://www.google.com" ? "blue" : "gray"}
              leftSection={<IconBrandGoogle size={16} />}
              onClick={() => setCurrentUrl("https://www.google.com")}
            >
              Google
            </Button>
          </Group>
        </Group>

        <Group gap="xs">
          {onPlay && (
            <Button
              size="sm"
              color="green"
              variant="filled"
              leftSection={<IconPlayerPlay size={18} />}
              onClick={onPlay}
              disabled={isGameRunning}
              mr="md"
            >
              {isGameRunning ? "Running..." : "Play"}
            </Button>
          )}
          {process.env.NODE_ENV === "development" && (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleOpenDev}
              title="Open Dev Tools"
            >
              <IconTools size={24} />
            </ActionIcon>
          )}
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onClose}
            title="Close"
          >
            <IconX size={24} />
          </ActionIcon>
        </Group>
      </Box>

      <Box style={{ flex: 1, position: "relative" }}>
        {opened && preloadPath && (
          <webview
            ref={(node) => {
              webviewRef.current = node;
              if (node) setWebview(node);
            }}
            src={currentUrl}
            style={{ width: "100%", height: "100%" }}
            preload={preloadPath}
            partition="persist:mapgenie"
          />
        )}
      </Box>
    </Modal>
  );
}
