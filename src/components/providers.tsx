"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { App, ConfigProvider, type ThemeConfig } from "antd";
import viVN from "antd/locale/vi_VN";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";

const theme: ThemeConfig = {
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

export function Providers({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const themeConfig = useMemo<ThemeConfig>(
    () => ({ ...theme, token: { ...theme.token, motion: !reducedMotion } }),
    [reducedMotion],
  );

  return (
    <StyleProvider layer>
      <ConfigProvider locale={viVN} theme={themeConfig}>
        <App>
          <AuthProvider>{children}</AuthProvider>
        </App>
      </ConfigProvider>
    </StyleProvider>
  );
}
