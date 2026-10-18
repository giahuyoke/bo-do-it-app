"use client";

import {
  Alert,
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tag,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import {
  createEvent,
  deleteEvent,
  updateEvent,
} from "@/lib/firebase/events";
import type { CalendarEvent, EventInput } from "@/lib/firebase/models";

interface EventFormValues {
  title: string;
  description?: string;
  location?: string;
  startAt: Dayjs;
  endAt: Dayjs;
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function EventPanel({ userId }: { userId: string }) {
  const { message } = App.useApp();
  const { error, events, loading } = useRealtimeEvents(userId, [], true);
  const [form] = Form.useForm<EventFormValues>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    const startAt = dayjs().add(1, "hour").startOf("hour");
    setEditingEvent(null);
    form.setFieldsValue({
      title: "",
      description: "",
      location: "",
      startAt,
      endAt: startAt.add(1, "hour"),
    });
    setModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    form.setFieldsValue({
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: dayjs(event.startAt),
      endAt: event.endAt ? dayjs(event.endAt) : dayjs(event.startAt).add(1, "hour"),
    });
    setModalOpen(true);
  };

  const saveEvent = async (values: EventFormValues) => {
    const input: EventInput = {
      title: values.title,
      description: values.description,
      location: values.location,
      startAt: values.startAt.toDate(),
      endAt: values.endAt.toDate(),
    };

    setSaving(true);
    try {
      if (editingEvent) {
        await updateEvent(userId, editingEvent.id, input);
        void message.success("Đã cập nhật sự kiện.");
      } else {
        await createEvent(userId, input);
        void message.success("Đã thêm sự kiện.");
      }
      setModalOpen(false);
      form.resetFields();
    } catch (saveError) {
      void message.error(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu sự kiện.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" onClick={openCreateModal}>
          Thêm sự kiện
        </Button>
      </div>

      {error ? (
        <Alert type="error" showIcon message="Không thể tải lịch trình" description={error.message} />
      ) : null}

      <List
        loading={loading}
        dataSource={events}
        locale={{ emptyText: <Empty description="Chưa có sự kiện" /> }}
        renderItem={(event) => (
          <List.Item
            actions={[
              <Button key="edit" type="link" onClick={() => openEditModal(event)}>
                Sửa
              </Button>,
              <Popconfirm
                key="delete"
                title="Xóa sự kiện?"
                description="Thao tác này không thể hoàn tác."
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={async () => {
                  try {
                    await deleteEvent(userId, event.id);
                    void message.success("Đã xóa sự kiện.");
                  } catch (deleteError) {
                    void message.error(
                      deleteError instanceof Error
                        ? deleteError.message
                        : "Không thể xóa sự kiện.",
                    );
                  }
                }}
              >
                <Button danger type="link">
                  Xóa
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={event.title}
              description={
                <Space direction="vertical" size={3}>
                  <Tag color="blue">
                    {dateFormatter.format(event.startAt)}
                    {event.endAt ? ` – ${dateFormatter.format(event.endAt)}` : ""}
                  </Tag>
                  {event.location ? <span>Địa điểm: {event.location}</span> : null}
                  {event.description ? <span>{event.description}</span> : null}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title={editingEvent ? "Cập nhật sự kiện" : "Thêm sự kiện"}
        open={modalOpen}
        okText={editingEvent ? "Cập nhật" : "Thêm"}
        cancelText="Hủy"
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        onOk={() => void form.submit()}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-5"
          onFinish={(values) => void saveEvent(values)}
        >
          <Form.Item
            name="title"
            label="Tên sự kiện"
            rules={[
              { required: true, message: "Nhập tên sự kiện." },
              { max: 200, message: "Tên tối đa 200 ký tự." },
            ]}
          >
            <Input placeholder="Ví dụ: Họp nhóm sản phẩm" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ max: 2000, message: "Mô tả tối đa 2.000 ký tự." }]}
          >
            <Input.TextArea rows={3} placeholder="Nội dung sự kiện" />
          </Form.Item>
          <Form.Item
            name="location"
            label="Địa điểm"
            rules={[{ max: 300, message: "Địa điểm tối đa 300 ký tự." }]}
          >
            <Input placeholder="Văn phòng hoặc đường dẫn họp" />
          </Form.Item>
          <div className="grid gap-3 sm:grid-cols-2">
            <Form.Item
              name="startAt"
              label="Bắt đầu"
              rules={[{ required: true, message: "Chọn thời gian bắt đầu." }]}
            >
              <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Form.Item
              name="endAt"
              label="Kết thúc"
              dependencies={["startAt"]}
              rules={[
                { required: true, message: "Chọn thời gian kết thúc." },
                ({ getFieldValue }) => ({
                  validator(_, value: Dayjs | undefined) {
                    const startAt = getFieldValue("startAt") as Dayjs | undefined;
                    if (!value || !startAt || value.isAfter(startAt)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Thời gian kết thúc phải sau thời gian bắt đầu."),
                    );
                  },
                }),
              ]}
            >
              <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
