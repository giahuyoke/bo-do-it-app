"use client";

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  ColorPicker,
  Form,
  Input,
  Empty,
  Modal,
  Popconfirm,
  Space,
  Typography,
} from "antd";
import { useState } from "react";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import type { PlannerTag } from "@/lib/firebase/models";
import { createTag, deleteTag, updateTag } from "@/lib/firebase/tags";

const { Text } = Typography;

interface TagFormValues {
  name: string;
  color: string;
}

interface TagManagerModalProps {
  userId: string;
  open: boolean;
  defaultTags: PlannerTag[];
  customTags: PlannerTag[];
  onClose: () => void;
  embedded?: boolean;
}

export function TagManagerModal({
  userId,
  open,
  defaultTags,
  customTags,
  onClose,
  embedded = false,
}: TagManagerModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<TagFormValues>();
  const [editingTag, setEditingTag] = useState<PlannerTag | null>(null);
  const [saving, setSaving] = useState(false);
  const color = Form.useWatch("color", form) ?? "#78c6a3";

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
      form.setFieldsValue({ name: "", color: "#78c6a3" });
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
          {!customTags.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa tạo tag riêng" /> : null}
          <ul className="tag-manager-list">
            {customTags.map((tag) => (
              <li key={tag.id}>
                <span className="tag-badge" style={{ background: `${tag.color}25` }}><i style={{ background: tag.color }} />{tag.name}</span>
                <div className="tag-row-actions">
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    aria-label={`Sửa tag ${tag.name}`}
                    onClick={() => {
                      setEditingTag(tag);
                      form.setFieldsValue({ name: tag.name, color: tag.color });
                    }}
                  />
                  <Popconfirm
                    key="delete"
                    title="Xóa tag này?"
                    description="Các kế hoạch cũ vẫn giữ màu tag hiện tại."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                      try {
                        await deleteTag(userId, tag.id);
                        if (editingTag?.id === tag.id) {
                          setEditingTag(null);
                          form.setFieldsValue({ name: "", color: "#78c6a3" });
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
          <div className="mt-5">
            <Text type="secondary" className="mb-2 block text-xs! uppercase tracking-wider">
              Tag gợi ý
            </Text>
            <Space size={[6, 8]} wrap>
              {defaultTags.map((tag) => (
                <span key={tag.id} className="tag-badge" style={{ background: `${tag.color}25` }}><i style={{ background: tag.color }} />{tag.name}</span>
              ))}
            </Space>
          </div>
        </div>

        <Form
          form={form}
          className="tag-manager-form"
          disabled={saving}
          initialValues={{ name: "", color: "#78c6a3" }}
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
          <Form.Item name="color" label="Màu" rules={[{ required: true }]} getValueFromEvent={(value) => value.toHexString()}>
            <ColorPicker
              value={color}
              format="hex"
              disabledAlpha
              showText
            />
          </Form.Item>
          <Space className="w-full justify-end">
            {editingTag ? (
              <Button
                onClick={() => {
                  setEditingTag(null);
                  form.setFieldsValue({ name: "", color: "#78c6a3" });
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
        <h1>Quản lý tag<span className="heading-sparkle">✳</span></h1>
        <p>Một chút màu sắc. Một ngày ngăn nắp hơn.<br />Tạo, đổi tên và chọn màu để phân loại kế hoạch theo cách của bạn.</p>
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
