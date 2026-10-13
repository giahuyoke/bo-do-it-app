"use client";

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Typography,
} from "antd";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import type { PlannerTag } from "@/lib/firebase/models";
import { createTag, deleteTag, updateTag } from "@/lib/firebase/tags";

const { Text } = Typography;

interface TagFormValues {
  name: string;
}

interface TagManagerModalProps {
  userId: string;
  open: boolean;
  customTags: PlannerTag[];
  onClose: () => void;
  embedded?: boolean;
}

export function TagManagerModal({
  userId,
  open,
  customTags,
  onClose,
  embedded = false,
}: TagManagerModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<TagFormValues>();
  const [editingTag, setEditingTag] = useState<PlannerTag | null>(null);
  const [saving, setSaving] = useState(false);

  const closeModal = () => {
    setEditingTag(null);
    form.resetFields();
    onClose();
  };

  const saveTag = async (values: TagFormValues) => {
    setSaving(true);
    try {
      if (editingTag) {
        await updateTag(userId, editingTag.id, values);
        void message.success("Đã cập nhật tag.");
      } else {
        await createTag(userId, values);
        void message.success("Đã tạo tag mới.");
      }
      setEditingTag(null);
      form.setFieldsValue({ name: "" });
    } catch (error) {
      void message.error(
        firebaseErrorMessage(error, "Không thể lưu tag."),
      );
    } finally {
      setSaving(false);
    }
  };

  const content = (
      <div className="tag-manager-layout">
        <div>
          <Text className="mb-3 block font-medium">Bộ sưu tập của bạn · {customTags.length}</Text>
          {!customTags.length ? (
            <EmptyState compact art="tags" title="Chưa có tag riêng"
              description="Đặt tên cho tag đầu tiên ở khung bên cạnh để gom kế hoạch theo chủ đề." />
          ) : null}
          <ul className="tag-manager-list">
            {customTags.map((tag) => (
              <li key={tag.id}>
                <span className="tag-badge">{tag.name}</span>
                <div className="tag-row-actions">
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    aria-label={`Sửa tag ${tag.name}`}
                    onClick={() => {
                      setEditingTag(tag);
                      form.setFieldsValue({ name: tag.name });
                    }}
                  />
                  <Popconfirm
                    key="delete"
                    title="Xóa tag này?"
                    description="Các kế hoạch đang gắn tag này sẽ không còn tag."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                      try {
                        await deleteTag(userId, tag.id);
                        if (editingTag?.id === tag.id) {
                          setEditingTag(null);
                          form.setFieldsValue({ name: "" });
                        }
                        void message.success("Đã xóa tag.");
                      } catch (error) {
                        void message.error(
                        firebaseErrorMessage(error, "Không thể xóa tag."),
                        );
                      }
                    }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Xóa tag ${tag.name}`}
                    />
                  </Popconfirm>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Form
          form={form}
          className="tag-manager-form"
          disabled={saving}
          initialValues={{ name: "" }}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => void saveTag(values)}
        >
          <Text className="mb-3 block font-medium">
            {editingTag ? "Sửa tag" : "Thêm tag mới"}
          </Text>
          <Form.Item
            name="name"
            label="Tên tag"
            rules={[
              { required: true, whitespace: true, message: "Nhập tên tag." },
              { max: 40, message: "Tên tag tối đa 40 ký tự." },
            ]}
          >
            <Input placeholder="Ví dụ: Thi cử" />
          </Form.Item>
          <Space className="w-full justify-end">
            {editingTag ? (
              <Button
                onClick={() => {
                  setEditingTag(null);
                  form.setFieldsValue({ name: "" });
                }}
              >
                Hủy sửa
              </Button>
            ) : null}
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<PlusOutlined />}
            >
              {editingTag ? "Cập nhật" : "Thêm tag"}
            </Button>
          </Space>
        </Form>
      </div>
  );

  if (embedded) return (
    <section className="tag-manager-page">
      <div className="tag-manager-heading">
        <span className="planner-eyebrow">MỌI THỨ ĐÚNG CHỖ</span>
        <h1>Quản lý tag<span className="heading-sparkle" aria-hidden="true" /></h1>
        <p>Tạo và đổi tên tag để phân loại kế hoạch theo cách của bạn.</p>
      </div>
      {content}
    </section>
  );

  return (
    <Modal title="Quản lý tag" open={open} width={720} footer={null} onCancel={closeModal} destroyOnHidden>
      {content}
    </Modal>
  );
}
