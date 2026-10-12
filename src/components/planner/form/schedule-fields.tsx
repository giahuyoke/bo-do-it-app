"use client";

import { Checkbox, DatePicker, Form } from "antd";
import type { Dayjs } from "dayjs";
import type { PlannerFormItemType } from "@/components/planner/form/types";

export function ScheduleFields({ type }: { type: PlannerFormItemType }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Form.Item
          name="startAt"
          label="Bắt đầu"
          rules={[{ required: true, message: "Chọn ngày bắt đầu." }]}
        >
          <DatePicker className="w-full" format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item
          name="endAt"
          label="Kết thúc (nếu có)"
          dependencies={["startAt"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value: Dayjs | undefined) {
                const startAt = getFieldValue("startAt") as Dayjs | undefined;
                if (!value || !startAt || !value.isBefore(startAt, "day")) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Ngày kết thúc không được trước ngày bắt đầu."),
                );
              },
            }),
          ]}
        >
          <DatePicker allowClear className="w-full" format="DD/MM/YYYY" />
        </Form.Item>
      </div>

      {type === "task" ? (
        <Form.Item name="completed" valuePropName="checked">
          <Checkbox>Đã hoàn thành</Checkbox>
        </Form.Item>
      ) : null}
    </>
  );
}
