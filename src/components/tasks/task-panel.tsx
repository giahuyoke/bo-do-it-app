"use client";

import { ItemTitle } from "@/components/planner/item-title";

import {
  Alert,
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  type TableProps,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import type {
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
} from "@/lib/firebase/models";
import { createTask, deleteTask, updateTask } from "@/lib/firebase/tasks";

interface TaskFormValues {
  title: string;
  description?: string;
  deadline?: Dayjs | null;
  priority: TaskPriority;
  status: TaskStatus;
}

const priorityLabels: Record<TaskPriority, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "green",
  medium: "gold",
  high: "red",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "Cần làm",
  in_progress: "Đang làm",
  done: "Hoàn thành",
};

const statusColors: Record<TaskStatus, string> = {
  todo: "default",
  in_progress: "processing",
  done: "success",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function TaskPanel({ userId }: { userId: string }) {
  const { message } = App.useApp();
  const { error, loading, tasks } = useRealtimeTasks(userId);
  const [form] = Form.useForm<TaskFormValues>();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingTask(null);
    form.setFieldsValue({
      title: "",
      description: "",
      deadline: null,
      priority: "medium",
      status: "todo",
    });
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      deadline: task.deadline ? dayjs(task.deadline) : null,
      priority: task.priority,
      status: task.status,
    });
    setModalOpen(true);
  };

  const saveTask = async (values: TaskFormValues) => {
    const input: TaskInput = {
      title: values.title,
      description: values.description,
      deadline: values.deadline?.toDate() ?? null,
      priority: values.priority,
      status: values.status,
    };

    setSaving(true);
    try {
      if (editingTask) {
        await updateTask(userId, editingTask.id, input);
        void message.success("Đã cập nhật công việc.");
      } else {
        await createTask(userId, input);
        void message.success("Đã thêm công việc.");
      }
      setModalOpen(false);
      form.resetFields();
    } catch (saveError) {
      void message.error(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu công việc.",
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: TableProps<Task>["columns"] = [
    {
      title: "Công việc",
      dataIndex: "title",
      key: "title",
      render: (_, task) => (
        <div>
          <ItemTitle title={task.title} completed={task.status === "done"} className="block font-medium text-slate-900" />
          {task.description ? (
            <div className="mt-1 max-w-md text-sm text-slate-500">
              {task.description}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Deadline",
      dataIndex: "deadline",
      key: "deadline",
      responsive: ["md"],
      render: (deadline: Date | null) =>
        deadline ? dateFormatter.format(deadline) : "Chưa đặt",
    },
    {
      title: "Ưu tiên",
      dataIndex: "priority",
      key: "priority",
      responsive: ["sm"],
      render: (priority: TaskPriority) => (
        <Tag color={priorityColors[priority]}>{priorityLabels[priority]}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: TaskStatus) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, task) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(task)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa công việc?"
            description="Thao tác này không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              try {
                await deleteTask(userId, task.id);
                void message.success("Đã xóa công việc.");
              } catch (deleteError) {
                void message.error(
                  deleteError instanceof Error
                    ? deleteError.message
                    : "Không thể xóa công việc.",
                );
              }
            }}
          >
            <Button danger type="link">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" onClick={openCreateModal}>
          Thêm công việc
        </Button>
      </div>

      {error ? (
        <Alert type="error" showIcon message="Không thể tải công việc" description={error.message} />
      ) : null}

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={tasks}
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        locale={{ emptyText: <Empty description="Chưa có công việc" /> }}
        scroll={{ x: 760 }}
      />

      <Modal
        title={editingTask ? "Cập nhật công việc" : "Thêm công việc"}
        open={modalOpen}
        okText={editingTask ? "Cập nhật" : "Thêm"}
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
          onFinish={(values) => void saveTask(values)}
        >
          <Form.Item
            name="title"
            label="Tên công việc"
            rules={[
              { required: true, message: "Nhập tên công việc." },
              { max: 200, message: "Tên tối đa 200 ký tự." },
            ]}
          >
            <Input placeholder="Ví dụ: Hoàn thành báo cáo" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ max: 2000, message: "Mô tả tối đa 2.000 ký tự." }]}
          >
            <Input.TextArea rows={3} placeholder="Ghi chú thêm" />
          </Form.Item>
          <Form.Item name="deadline" label="Deadline">
            <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <div className="grid gap-3 sm:grid-cols-2">
            <Form.Item name="priority" label="Mức độ ưu tiên" rules={[{ required: true }]}>
              <Select
                options={Object.entries(priorityLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
              <Select
                options={Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
