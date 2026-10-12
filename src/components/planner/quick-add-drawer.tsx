"use client";

import {
  App,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Space,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import { ItemColorButton } from "@/components/planner/form/item-color-button";
import { PlannerDetailsFields } from "@/components/planner/form/planner-details-fields";
import { PlannerTypeField } from "@/components/planner/form/planner-type-field";
import { ScheduleFields } from "@/components/planner/form/schedule-fields";
import type {
  PlannerFormItemType,
  PlannerFormValues,
} from "@/components/planner/form/types";
import { deleteEvent, saveEventSeries } from "@/lib/firebase/events";
import type {
  EventInput,
  PlannerTag,
  TaskInput,
} from "@/lib/firebase/models";
import { deleteTask, saveTaskSeries } from "@/lib/firebase/tasks";
import { defaultItemColor, type PlannerItem } from "@/lib/planner";

interface QuickAddDrawerProps {
  userId: string;
  open: boolean;
  initialDate: Dayjs;
  initialType: PlannerFormItemType;
  item: PlannerItem | null;
  tags: PlannerTag[];
  onClose: () => void;
  onOpenTagManager: () => void;
}

export function QuickAddDrawer({
  userId,
  open,
  initialDate,
  initialType,
  item,
  tags,
  onClose,
  onOpenTagManager,
}: QuickAddDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<PlannerFormValues>();
  const itemType = Form.useWatch("type", form) ?? initialType;
  const saveAndContinue = useRef(false);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  // A deleted tag would render as its raw id in the Select; drop it instead.
  // An effect event, so tag updates mid-edit never reset the form.
  const knownTagId = useEffectEvent((tagId: string | null) =>
    tags.some((tag) => tag.id === tagId) ? tagId! : undefined,
  );

  useEffect(() => {
    if (!open) return;

    if (item?.kind === "task") {
      form.setFieldsValue({
        type: "task",
        title: item.data.title,
        ranges: [{
          startAt: item.data.deadline ? dayjs(item.data.deadline) : initialDate,
          endAt: item.data.endAt ? dayjs(item.data.endAt) : null,
        }],
        color: item.data.tagColor,
        completed: item.data.status === "done",
        reminderMinutes: item.data.reminderMinutes ?? -1,
        tagId: knownTagId(item.data.tagId),
        note: item.data.description,
      });
      return;
    }

    if (item?.kind === "event") {
      form.setFieldsValue({
        type: "event",
        title: item.data.title,
        ranges: [{
          startAt: dayjs(item.data.startAt),
          endAt: item.data.endAt ? dayjs(item.data.endAt) : null,
        }],
        color: item.data.tagColor,
        reminderMinutes: item.data.reminderMinutes ?? -1,
        tagId: knownTagId(item.data.tagId),
        note: item.data.description,
      });
      return;
    }

    form.setFieldsValue({
      type: initialType,
      title: "",
      ranges: [{ startAt: initialDate.startOf("day"), endAt: null }],
      color: "",
      completed: false,
      reminderMinutes: -1,
      tagId: undefined,
      note: "",
    });
  }, [form, initialDate, initialType, item, open]);

  const submit = async (values: PlannerFormValues) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const selectedTag = tags.find((tag) => tag.id === values.tagId);
    const sharedFields = {
      title: values.title,
      description: values.note,
      tagId: selectedTag?.id ?? null,
      tagName: selectedTag?.name ?? "",
      tagColor: values.color ?? "",
      reminderMinutes:
        values.reminderMinutes === -1 ? null : values.reminderMinutes,
    };

    // Plans are date-only: span from the start of the first day to the end of
    // the last, so a same-day end still satisfies the rules' endAt > startAt.
    const ranges = values.ranges.flatMap((range) =>
      range.startAt
        ? [{
            startAt: range.startAt.startOf("day").toDate(),
            endAt: range.endAt?.endOf("day").toDate() ?? null,
          }]
        : [],
    );
    // Extra rows are new copies: they start open, whatever the first row says.
    const isCopy = (index: number) => index > 0;

    try {
      if (!ranges.length) return;

      if (values.type === "task") {
        const existing = item?.kind === "task" ? item.data : null;
        const taskInputs = ranges.map((range, index): TaskInput => ({
          ...sharedFields,
          deadline: range.startAt,
          endAt: range.endAt,
          completed: isCopy(index) ? false : (values.completed ?? false),
          priority: existing?.priority ?? "medium",
          status:
            !isCopy(index) && existing?.status === "in_progress" ? "in_progress" : "todo",
        }));
        await saveTaskSeries(userId, existing?.id ?? null, taskInputs);
      } else {
        const existing = item?.kind === "event" ? item.data : null;
        const eventInputs = ranges.map((range, index): EventInput => ({
          ...sharedFields,
          // The form no longer edits location; the edited event keeps its own.
          location: existing && !isCopy(index) ? existing.location : "",
          startAt: range.startAt,
          endAt: range.endAt,
        }));
        await saveEventSeries(userId, existing?.id ?? null, eventInputs);
      }

      const added = item ? ranges.length - 1 : ranges.length;
      void message.success(
        item
          ? added
            ? `Đã cập nhật và thêm ${added} kế hoạch mới.`
            : "Đã cập nhật kế hoạch."
          : added > 1
            ? `Đã thêm ${added} kế hoạch.`
            : "Đã thêm vào planner.",
      );

      if (saveAndContinue.current && !item) {
        form.setFieldsValue({ title: "", note: "" });
        saveAndContinue.current = false;
      } else {
        onClose();
      }
    } catch (error) {
      saveAndContinue.current = false;
      void message.error(
        firebaseErrorMessage(error, "Không thể lưu kế hoạch."),
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={item ? "Chỉnh sửa kế hoạch" : "Thêm kế hoạch mới"}
      open={open}
      size={520}
      className="planner-editor"
      onClose={() => { if (!savingRef.current) onClose(); }}
      destroyOnHidden
      styles={{ body: { paddingBottom: 96 } }}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {item ? (
              <Popconfirm
                title="Xóa kế hoạch này?"
                description="Thao tác này không thể hoàn tác."
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={async () => {
                  try {
                    if (item.kind === "task") {
                      await deleteTask(userId, item.data.id);
                    } else {
                      await deleteEvent(userId, item.data.id);
                    }
                    void message.success("Đã xóa kế hoạch.");
                    onClose();
                  } catch (error) {
                    void message.error(
                      error instanceof Error
                        ? error.message
                        : "Không thể xóa kế hoạch.",
                    );
                  }
                }}
              >
                <Button danger disabled={saving}>Xóa</Button>
              </Popconfirm>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={onClose} disabled={saving}>Hủy</Button>
            {!item ? (
            <Button
              disabled={saving}
              onClick={() => {
                saveAndContinue.current = true;
                void form.submit();
              }}
            >
              Lưu & thêm tiếp
            </Button>
            ) : null}
            <Button
              type="primary"
              loading={saving}
              onClick={() => {
                saveAndContinue.current = false;
                void form.submit();
              }}
            >
              {item ? "Lưu thay đổi" : "Lưu kế hoạch"}
            </Button>
          </div>
        </div>
      }
    >
      <Form
        form={form}
        disabled={saving}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void submit(values)}
      >
        <PlannerTypeField disabled={Boolean(item)} />

        <Form.Item label="Nội dung" required>
          <Space.Compact className="w-full">
            <Form.Item
              name="title"
              noStyle
              rules={[
                { required: true, whitespace: true, message: "Nhập nội dung kế hoạch." },
                { max: 200, message: "Nội dung tối đa 200 ký tự." },
              ]}
            >
              <Input size="large" placeholder="Bạn dự định làm gì?" autoFocus />
            </Form.Item>
            <Form.Item name="color" noStyle>
              <ItemColorButton fallbackColor={defaultItemColor(itemType)} />
            </Form.Item>
          </Space.Compact>
        </Form.Item>

        <ScheduleFields type={itemType} />
        <PlannerDetailsFields
          userId={userId}
          tags={tags}
          onOpenTagManager={onOpenTagManager}
        />
      </Form>
    </Drawer>
  );
}
