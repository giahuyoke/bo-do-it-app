"use client";

import { DatePicker, Form, Select } from "antd";

const priorityOptions = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Vừa" },
  { value: "high", label: "Cao" },
];

const statusOptions = [
  { value: "todo", label: "Cần làm" },
  { value: "in_progress", label: "Đang làm" },
  { value: "done", label: "Hoàn thành" },
];

export function TaskFields() {
  return (
    <>
      <Form.Item
        name="deadline"
        label="Ngày hoàn thành"
        rules={[{ required: true, message: "Chọn ngày hoàn thành." }]}
      >
        <DatePicker
          showTime
          className="w-full"
          format="DD/MM/YYYY HH:mm"
        />
      </Form.Item>
      <div className="grid grid-cols-2 gap-3">
        <Form.Item name="priority" label="Ưu tiên">
          <Select options={priorityOptions} />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái">
          <Select options={statusOptions} />
        </Form.Item>
      </div>
    </>
  );
}
