"use client";

import { EnvironmentOutlined } from "@ant-design/icons";
import { DatePicker, Form, Input } from "antd";
import type { Dayjs } from "dayjs";

export function EventFields() {
  return (
    <>
      <Form.Item
        name="eventRange"
        label="Bắt đầu và kết thúc"
        rules={[
          { required: true, message: "Chọn khoảng thời gian." },
          {
            validator(_, value: [Dayjs, Dayjs] | undefined) {
              if (!value || value[1].isAfter(value[0])) {
                return Promise.resolve();
              }
              return Promise.reject(
                new Error("Thời gian kết thúc phải sau thời gian bắt đầu."),
              );
            },
          },
        ]}
      >
        <DatePicker.RangePicker
          showTime
          className="w-full"
          format="DD/MM/YYYY HH:mm"
        />
      </Form.Item>
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
    </>
  );
}
