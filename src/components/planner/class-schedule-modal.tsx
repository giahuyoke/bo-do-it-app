"use client";

import { App, DatePicker, Form, Input, Modal, Space } from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { ItemColorButton } from "@/components/planner/form/item-color-button";
import {
  classSessionDates,
  classWeekdays,
  maxClassSessions,
} from "@/lib/class-schedule";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import { saveEventSeries } from "@/lib/firebase/events";
import type { EventInput } from "@/lib/firebase/models";
import { defaultItemColor } from "@/lib/planner";

interface ClassScheduleValues {
  title: string;
  color: string;
  range: [Dayjs, Dayjs] | null;
  weekdays: number[];
}

interface ClassScheduleModalProps {
  userId: string;
  open: boolean;
  /** Pre-fills the first day of the course and its weekday. */
  initialDate: Dayjs;
  onClose: () => void;
}

/** Weekday toggles, Monday first; a controlled field for Form. */
function WeekdayPicker({
  value = [],
  onChange,
}: {
  value?: number[];
  onChange?: (value: number[]) => void;
}) {
  return (
    <div className="weekday-picker" role="group" aria-label="Ngày học trong tuần">
      {classWeekdays.map((weekday) => {
        const selected = value.includes(weekday.value);
        return (
          <button
            key={weekday.value}
            type="button"
            className={selected ? "is-selected" : ""}
            aria-pressed={selected}
            onClick={() =>
              onChange?.(
                selected
                  ? value.filter((day) => day !== weekday.value)
                  : [...value, weekday.value],
              )
            }
          >
            {weekday.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Turns a course into calendar entries: one event per class day between the
 * start and end dates, on the chosen weekdays, all saved in one batch.
 */
export function ClassScheduleModal({
  userId,
  open,
  initialDate,
  onClose,
}: ClassScheduleModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ClassScheduleValues>();
  const [saving, setSaving] = useState(false);
  const range = Form.useWatch("range", form);
  const weekdays = Form.useWatch("weekdays", form);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: "",
      color: "",
      range: [initialDate.startOf("day"), initialDate.add(3, "month").startOf("day")],
      weekdays: [initialDate.day()],
    });
  }, [form, initialDate, open]);

  const sessions =
    range?.[0] && range[1] && weekdays?.length
      ? classSessionDates(range[0], range[1], weekdays)
      : [];
  const tooMany = sessions.length > maxClassSessions;

  const save = async (values: ClassScheduleValues) => {
    if (!sessions.length || tooMany) return;
    setSaving(true);
    const inputs = sessions.map(
      (date): EventInput => ({
        title: values.title,
        startAt: date.toDate(),
        endAt: null,
        tagColor: values.color ?? "",
      }),
    );
    try {
      await saveEventSeries(userId, null, inputs);
      void message.success(`Đã thêm ${inputs.length} buổi “${values.title.trim()}” vào lịch.`);
      onClose();
    } catch (error) {
      void message.error(firebaseErrorMessage(error, "Không thể lưu lịch học."));
    } finally {
      setSaving(false);
    }
  };

  const summary = (() => {
    if (!weekdays?.length) return "Chọn ít nhất một ngày trong tuần.";
    if (!range?.[0] || !range[1]) return "Chọn ngày bắt đầu và kết thúc.";
    if (tooMany) return `Quá nhiều buổi (tối đa ${maxClassSessions}). Hãy thu hẹp khoảng ngày.`;
    if (!sessions.length) return "Không có buổi nào rơi vào các ngày đã chọn.";
    const days = classWeekdays
      .filter((weekday) => weekdays.includes(weekday.value))
      .map((weekday) => weekday.label)
      .join(", ");
    return `${sessions.length} buổi · ${days} · từ ${sessions[0].format("DD/MM/YYYY")} đến ${sessions.at(-1)!.format("DD/MM/YYYY")}`;
  })();

  return (
    <Modal
      title="Nhập lịch học"
      open={open}
      okText={sessions.length && !tooMany ? `Thêm ${sessions.length} buổi` : "Thêm vào lịch"}
      cancelText="Hủy"
      confirmLoading={saving}
      okButtonProps={{ disabled: !sessions.length || tooMany }}
      onOk={() => void form.submit()}
      onCancel={() => {
        if (!saving) onClose();
      }}
      destroyOnHidden
    >
      <Form
        form={form}
        className="mt-5"
        layout="vertical"
        requiredMark={false}
        disabled={saving}
        onFinish={(values) => void save(values)}
      >
        <Form.Item label="Nội dung" required>
          <Space.Compact className="w-full">
            <Form.Item
              name="title"
              noStyle
              rules={[
                { required: true, whitespace: true, message: "Nhập tên môn học." },
                { max: 200, message: "Nội dung tối đa 200 ký tự." },
              ]}
            >
              <Input size="large" placeholder="Ví dụ: Lịch sử Đông Á" autoFocus />
            </Form.Item>
            <Form.Item name="color" noStyle>
              <ItemColorButton fallbackColor={defaultItemColor("event")} />
            </Form.Item>
          </Space.Compact>
        </Form.Item>

        <Form.Item
          name="range"
          label="Thời gian học"
          rules={[{ required: true, message: "Chọn ngày bắt đầu và kết thúc." }]}
        >
          <DatePicker.RangePicker
            className="w-full"
            format="DD/MM/YYYY"
            placeholder={["Bắt đầu", "Kết thúc"]}
            allowClear={false}
          />
        </Form.Item>

        <Form.Item
          name="weekdays"
          label="Học vào"
          rules={[{ required: true, type: "array", min: 1, message: "Chọn ít nhất một ngày." }]}
        >
          <WeekdayPicker />
        </Form.Item>

        <p className={`class-schedule-summary ${tooMany || !sessions.length ? "is-warning" : ""}`}>
          {summary}
        </p>
      </Form>
    </Modal>
  );
}
