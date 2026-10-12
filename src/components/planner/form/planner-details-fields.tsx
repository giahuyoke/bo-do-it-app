"use client";

import {
  BellOutlined,
  EditOutlined,
  PlusOutlined,
  SettingOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Select, Space } from "antd";
import { useState } from "react";
import { QuickTagEditor } from "@/components/planner/form/quick-tag-editor";
import type { PlannerTag } from "@/lib/firebase/models";
import { reminderOptions } from "@/lib/planner";

interface PlannerDetailsFieldsProps {
  userId: string;
  tags: PlannerTag[];
  onOpenTagManager: () => void;
}

export function PlannerDetailsFields({
  userId,
  tags,
  onOpenTagManager,
}: PlannerDetailsFieldsProps) {
  const form = Form.useFormInstance();
  const selectedTagId = Form.useWatch("tagId", form) as string | undefined;
  const [quickEditorOpen, setQuickEditorOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<PlannerTag | null>(null);
  const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? null;
  const canEditSelectedTag = selectedTag !== null;

  const openQuickEditor = (tag: PlannerTag | null) => {
    setEditingTag(tag);
    setQuickEditorOpen(true);
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Form.Item name="reminderMinutes" label="Nhắc hẹn">
          <Select
            suffixIcon={<BellOutlined />}
            virtual={false}
            popupMatchSelectWidth
            getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
            options={reminderOptions}
          />
        </Form.Item>
        <Form.Item label="Tag">
          <Space.Compact className="w-full">
            <Form.Item name="tagId" noStyle>
              <Select
                allowClear
                className="w-full"
                popupClassName="planner-tag-select-popup"
                placeholder="Chọn tag"
                suffixIcon={<TagOutlined />}
                virtual={false}
                popupMatchSelectWidth={240}
                getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
                options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
              />
            </Form.Item>
            <Button
              icon={<PlusOutlined />}
              aria-label="Thêm tag nhanh"
              onClick={() => openQuickEditor(null)}
            />
            <Button
              icon={<EditOutlined />}
              aria-label="Sửa tag đang chọn"
              disabled={!canEditSelectedTag}
              onClick={() => openQuickEditor(selectedTag)}
            />
          </Space.Compact>
          <Button
            type="link"
            size="small"
            className="mt-1 px-0!"
            icon={<SettingOutlined />}
            onClick={onOpenTagManager}
          >
            Quản lý tất cả tag
          </Button>
        </Form.Item>
      </div>

      <Form.Item
        name="note"
        label="Ghi chú"
        rules={[{ max: 2000, message: "Ghi chú tối đa 2.000 ký tự." }]}
      >
        <Input.TextArea
          rows={4}
          showCount
          maxLength={2000}
          placeholder="Thêm chi tiết để bạn dễ nhớ hơn..."
        />
      </Form.Item>

      <QuickTagEditor
        userId={userId}
        open={quickEditorOpen}
        tag={editingTag}
        onClose={() => setQuickEditorOpen(false)}
        onSaved={(tagId) => form.setFieldValue("tagId", tagId)}
      />
    </>
  );
}
