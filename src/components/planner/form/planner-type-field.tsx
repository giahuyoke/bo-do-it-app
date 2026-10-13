"use client";

import { CalendarOutlined, CheckSquareOutlined } from "@ant-design/icons";
import { Form, Segmented, Space } from "antd";
import type { PlannerFormItemType } from "@/components/planner/form/types";

const typeNames: Record<PlannerFormItemType, string> = {
  event: "lịch trình",
  task: "nhiệm vụ",
};

/** `originalType` is the kind of the plan being edited, if any. */
export function PlannerTypeField({ originalType }: { originalType?: PlannerFormItemType }) {
  const type = Form.useWatch("type") as PlannerFormItemType | undefined;
  const converting = originalType !== undefined && type !== undefined && type !== originalType;

  return (
    <Form.Item
      name="type"
      label="Loại kế hoạch"
      extra={
        converting
          ? `Khi lưu, ${typeNames[originalType]} này sẽ được chuyển thành ${typeNames[type]}.`
          : undefined
      }
    >
      <Segmented
        block
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
