"use client";

import { DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import type { ThemePreference } from "@/lib/theme";

const options: Array<{ key: ThemePreference; label: string; icon: ReactNode }> = [
  { key: "light", label: "Sáng", icon: <SunOutlined /> },
  { key: "dark", label: "Tối", icon: <MoonOutlined /> },
  { key: "system", label: "Theo thiết bị", icon: <DesktopOutlined /> },
];

/** A "Giao diện" group for any antd Dropdown menu, with the current choice checked. */
export function useThemeMenuItems(): NonNullable<MenuProps["items"]> {
  const { preference, setPreference } = useTheme();
  return [
    {
      key: "theme",
      type: "group",
      label: "Giao diện",
      children: options.map((option) => ({
        key: `theme-${option.key}`,
        icon: option.icon,
        label: option.label,
        // antd menus have no radio items; aria-checked tells screen readers.
        extra: preference === option.key ? "✓" : undefined,
        role: "menuitemradio",
        "aria-checked": preference === option.key,
        onClick: () => setPreference(option.key),
      })),
    },
  ];
}
