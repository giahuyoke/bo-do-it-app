"use client";

import { CopyOutlined } from "@ant-design/icons";
import { App, Button } from "antd";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const { message } = App.useApp();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      void message.success("Đã copy");
    } catch {
      void message.error("Không copy được");
    }
  };
  return (
    <Button icon={<CopyOutlined />} disabled={!text} onClick={() => void copy()}>
      {label}
    </Button>
  );
}
