"use client";

import { EnvironmentOutlined } from "@ant-design/icons";
import { Checkbox, DatePicker, Form, Input } from "antd";
import type { Dayjs } from "dayjs";
import type { PlannerFormItemType } from "@/components/planner/form/types";

export function ScheduleFields({ type }: { type: PlannerFormItemType }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Form.Item
          name="startAt"
          label="Bắt đầu"
          rules={[{ required: true, message: "Chọn thời gian bắt đầu." }]}
        >
          <DatePicker
            showTime
            className="w-full"
            format="DD/MM/YYYY HH:mm"
          />
        </Form.Item>
        <Form.Item
          name="endAt"
          label="Kết thúc (nếu có)"
          dependencies={["startAt"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value: Dayjs | undefined) {
                const startAt = getFieldValue("startAt") as Dayjs | undefined;
                if (!value || !startAt || value.isAfter(startAt)) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Kết thúc phải sau thời gian bắt đầu."),
                );
              },
            }),
          ]}
        >
          <DatePicker
            allowClear
            showTime
            className="w-full"
            format="DD/MM/YYYY HH:mm"
          />
        </Form.Item>
      </div>

      {type === "event" ? (
        <Form.Item
          name="location"
          label="Địa điểm"
          rules={[{ max: 300, message: "Địa điểm tối đa 300 ký tự." }]}
        >
          <Input
            prefix={<EnvironmentOutlined className="text-slate-400" />}
            placeholder="Lớp học, văn phòng hoặc đường dẫn họp"
          />
        </Form.Item>
      ) : (
        <Form.Item name="completed" valuePropName="checked">
          <Checkbox>Đã hoàn thành</Checkbox>
        </Form.Item>
      )}
    </>
  );
}
