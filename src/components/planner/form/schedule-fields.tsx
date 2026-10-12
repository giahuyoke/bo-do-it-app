"use client";

import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, DatePicker, Form } from "antd";
import type { Dayjs } from "dayjs";
import type { PlannerFormItemType } from "@/components/planner/form/types";

/** Each row becomes its own plan, so this caps one save at a sane batch. */
export const maxScheduleRanges = 20;

export function ScheduleFields({ type }: { type: PlannerFormItemType }) {
  return (
    <>
      <Form.List name="ranges">
        {(fields, { add, remove }) => (
          <div className="schedule-ranges">
            {fields.map((field, index) => (
              <div className="schedule-range-row" key={field.key}>
                <Form.Item
                  name={[field.name, "startAt"]}
                  label={index === 0 ? "Bắt đầu" : undefined}
                  rules={[{ required: true, message: "Chọn ngày bắt đầu." }]}
                >
                  <DatePicker className="w-full" format="DD/MM/YYYY" />
                </Form.Item>
                <Form.Item
                  name={[field.name, "endAt"]}
                  label={index === 0 ? "Kết thúc (nếu có)" : undefined}
                  dependencies={[["ranges", field.name, "startAt"]]}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value: Dayjs | null | undefined) {
                        const startAt = getFieldValue([
                          "ranges",
                          field.name,
                          "startAt",
                        ]) as Dayjs | undefined;
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
                {fields.length > 1 ? (
                  <Button
                    type="text"
                    className="schedule-range-remove"
                    icon={<CloseOutlined />}
                    aria-label={`Bỏ khoảng ngày thứ ${index + 1}`}
                    onClick={() => remove(field.name)}
                  />
                ) : null}
              </div>
            ))}
            {fields.length < maxScheduleRanges ? (
              <Button
                type="link"
                size="small"
                className="schedule-range-add"
                icon={<PlusOutlined />}
                onClick={() => add({ startAt: null, endAt: null })}
              >
                Thêm ngày
              </Button>
            ) : null}
          </div>
        )}
      </Form.List>

      {type === "task" ? (
        <Form.Item name="completed" valuePropName="checked">
          <Checkbox>Đã hoàn thành</Checkbox>
        </Form.Item>
      ) : null}
    </>
  );
}
