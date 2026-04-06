import "@mantine/core/styles.css";
import "@mantine/carousel/styles.css";
import { Outfit } from "next/font/google";
import React from "react";
import {
  MantineProvider,
  ColorSchemeScript,
  mantineHtmlProps,
  Center,
  Loader,
} from "@mantine/core";
import { theme } from "../theme";
import { AppLayoutShell } from "../components/AppLayoutShell";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import { AuthProvider } from "../components/providers/AuthProvider";
import { SyncProvider } from "../components/providers/SyncProvider";
import { Notifications } from "@mantine/notifications";
import { NotificationServiceHandler } from "../components/providers/NotificationServiceHandler";
import { AppInitializer } from "../components/providers/AppInitializer";
import { InitializationProvider } from "../components/providers/InitializationProvider";

export const metadata = {
  title: "FitGirl Repacks Manager",
  description: "Next-gen game library manager",
};

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" {...mantineHtmlProps} className={outfit.className}>
      <head>
        <ColorSchemeScript />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'  style-src 'self' 'unsafe-inline' img-src 'self' data: https: http: *;  font-src 'self' data:; frame-src 'self' https://www.youtube.com; media-src 'self' https: http:;"
        />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .repack-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 30px rgba(0,0,0,0.5);
            border-color: var(--mantine-color-blue-6) !important;
          }
          .repack-card:hover .mantine-Carousel-control {
            opacity: 1;
          }
        `,
          }}
        />
      </head>
      <body
        style={{
          background:
            "radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)",
          minHeight: "100vh",
          color: "#C1C2C5",
          fontFamily: outfit.style.fontFamily,
          overflow: "hidden",
        }}
      >
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <Notifications />
          <NotificationServiceHandler />
          <InitializationProvider>
            <AuthProvider>
              <SyncProvider>
                <AppInitializer />
                <React.Suspense
                  fallback={
                    <Center h="100vh">
                      <Loader size="xl" />
                    </Center>
                  }
                >
                  <AppLayoutShell>{children}</AppLayoutShell>
                </React.Suspense>
              </SyncProvider>
            </AuthProvider>
          </InitializationProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
