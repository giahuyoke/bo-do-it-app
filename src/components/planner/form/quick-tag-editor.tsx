"use client";

import { App, Form, Input, Modal } from "antd";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import { useEffect, useState } from "react";
import type { PlannerTag } from "@/lib/firebase/models";
import { createTag, updateTag } from "@/lib/firebase/tags";
import { NativeColorField } from "@/components/planner/form/native-color-field";

interface QuickTagEditorProps {
  userId: string;
  open: boolean;
  tag: PlannerTag | null;
  onClose: () => void;
  onSaved: (tagId: string) => void;
}

interface TagFormValues {
  name: string;
  color: string;
}

export function QuickTagEditor({
  userId,
  open,
  tag,
  onClose,
  onSaved,
}: QuickTagEditorProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<TagFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: tag?.name ?? "",
      color: tag?.color ?? "#78c6a3",
    });
  }, [form, open, tag]);

  const save = async (values: TagFormValues) => {
    setSaving(true);
    try {
      if (tag) {
        await updateTag(userId, tag.id, values);
        onSaved(tag.id);
      } else {
        const created = await createTag(userId, values);
        onSaved(created.id);
      }
      onClose();
    } catch (error) {
      void message.error(firebaseErrorMessage(error, "Không thể lưu tag."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={tag ? "Sửa tag" : "Thêm tag nhanh"}
      open={open}
      okText={tag ? "Cập nhật" : "Thêm tag"}
      cancelText="Hủy"
      confirmLoading={saving}
      onCancel={onClose}
      onOk={() => void form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        disabled={saving}
        className="mt-5"
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void save(values)}
      >
        <Form.Item
          name="name"
          label="Tên tag"
          rules={[
            { required: true, whitespace: true, message: "Nhập tên tag." },
            { max: 40, message: "Tên tag tối đa 40 ký tự." },
          ]}
        >
          <Input autoFocus placeholder="Ví dụ: Thi cử" />
        </Form.Item>
        <Form.Item name="color" label="Màu" rules={[{ required: true }]}>
          <NativeColorField />
        </Form.Item>
      </Form>
    </Modal>
  );
}
