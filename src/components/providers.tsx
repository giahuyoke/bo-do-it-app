"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { App, ConfigProvider, theme as antdTheme, type ThemeConfig } from "antd";
import viVN from "antd/locale/vi_VN";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider, useTheme } from "@/components/theme-provider";

const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: "#956b18",
    colorInfo: "#956b18",
    colorSuccess: "#58a97d",
    colorWarning: "#d5a936",
    colorError: "#dc6e73",
    colorText: "#302b20",
    colorTextSecondary: "#6b5f48",
    colorTextTertiary: "#786c55",
    colorTextPlaceholder: "#847963",
    colorBorder: "#e9e0ce",
    colorBgLayout: "#faf8f1",
    borderRadius: 12,
    borderRadiusLG: 18,
    fontFamily: 'var(--font-vietnam), "Segoe UI", sans-serif',
    controlHeight: 40,
  },
  components: {
    Button: { controlHeightLG: 44 },
    Drawer: { paddingLG: 24 },
    Segmented: { itemSelectedBg: "#ffffff" },
  },
};

// Warm charcoal rather than antd's blue-black, so the dark theme keeps the
// app's paper-and-honey feel. Matches the dark tokens in globals.css.
const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...lightTheme.token,
    colorPrimary: "#e2b85a",
    colorInfo: "#e2b85a",
    colorSuccess: "#6cc196",
    colorWarning: "#e2b85a",
    colorError: "#ec8a8e",
    colorText: "#efe7d6",
    colorTextSecondary: "#bfb39c",
    colorTextTertiary: "#a39882",
    colorTextPlaceholder: "#8d836f",
    colorBorder: "#3b3428",
    colorBgLayout: "#15130f",
    colorBgContainer: "#1f1c16",
    colorBgElevated: "#2a261e",
  },
  components: {
    ...lightTheme.components,
    Segmented: { itemSelectedBg: "#3a3326" },
  },
};

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

function ThemedApp({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const themeConfig = useMemo<ThemeConfig>(() => {
    const base = theme === "dark" ? darkTheme : lightTheme;
    return { ...base, token: { ...base.token, motion: !reducedMotion } };
  }, [reducedMotion, theme]);

  return (
    <ConfigProvider locale={viVN} theme={themeConfig}>
      <App>
        <AuthProvider>{children}</AuthProvider>
      </App>
    </ConfigProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ThemeProvider>
        <ThemedApp>{children}</ThemedApp>
      </ThemeProvider>
    </StyleProvider>
  );
}
