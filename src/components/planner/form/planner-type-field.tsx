"use client";

import { CalendarOutlined, CheckSquareOutlined } from "@ant-design/icons";
import { Form, Segmented, Space } from "antd";

export function PlannerTypeField({ disabled }: { disabled: boolean }) {
  return (
    <Form.Item name="type" label="Loại kế hoạch">
      <Segmented
        block
        disabled={disabled}
        options={[
          {
            value: "event",
            label: (
              <Space size={6}>
                <CalendarOutlined /> Lịch trình
              </Space>
            ),
          },
          {
            value: "task",
            label: (
              <Space size={6}>
                <CheckSquareOutlined /> Nhiệm vụ
              </Space>
            ),
          },
        ]}
      />
    </Form.Item>
  );
}
