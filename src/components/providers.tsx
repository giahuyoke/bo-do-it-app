"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { App, ConfigProvider, type ThemeConfig } from "antd";
import viVN from "antd/locale/vi_VN";
import type { ReactNode } from "react";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#4f46e5",
    borderRadius: 10,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider locale={viVN} theme={theme}>
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  );
}
