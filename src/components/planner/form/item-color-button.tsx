"use client";

import { Button, Popover } from "antd";
import { useState } from "react";
import { NativeColorField } from "@/components/planner/form/native-color-field";

interface ItemColorButtonProps {
  value?: string;
  onChange?: (value: string) => void;
  /** Shown while no color is picked, so the swatch matches the calendar. */
  fallbackColor: string;
}

export function ItemColorButton({
  value,
  onChange,
  fallbackColor,
}: ItemColorButtonProps) {
  const [open, setOpen] = useState(false);
  const color = value || fallbackColor;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      content={
        <div className="item-color-popover">
          <NativeColorField value={color} onChange={onChange} />
        </div>
      }
    >
      <Button
        size="large"
        className="item-color-button"
        aria-label="Chọn màu kế hoạch"
        title="Chọn màu"
      >
        <span className="native-color-swatch" style={{ backgroundColor: color }} />
      </Button>
    </Popover>
  );
}
