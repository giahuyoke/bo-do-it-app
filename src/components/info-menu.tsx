"use client";

import { HeartOutlined, InfoCircleOutlined, ReadOutlined } from "@ant-design/icons";
import { Modal, Timeline, Typography, type MenuProps } from "antd";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import { patchNotes } from "@/lib/patch-notes";

const { Paragraph, Text, Title } = Typography;

type InfoDialog = "about" | "patch-notes";

function AboutContent() {
  return (
    <div className="info-dialog">
      <div className="planner-brand">
        <span className="planner-logo">B</span>
        <div>
          <strong>Bo do it</strong>
          <span>For my wife</span>
        </div>
      </div>
      <Paragraph>
        Bo do it là một planner nhỏ được làm riêng cho vợ — để sắp xếp lịch học, nhiệm vụ,
        sự kiện và ghi chú mỗi ngày ở cùng một chỗ, nhẹ nhàng và không rối mắt.
      </Paragraph>
      <Paragraph>
        Mỗi tính năng đều bắt đầu từ một nhu cầu thật trong nhà. Nếu có gì muốn thêm hay thấy
        chỗ nào chưa tiện, cứ nói với chồng nhé <HeartOutlined />
      </Paragraph>
      <Text type="secondary">Phiên bản {patchNotes[0]?.date.replaceAll("-", ".")}</Text>
    </div>
  );
}

function PatchNotesContent() {
  return (
    <div className="info-dialog info-dialog-scroll">
      <Timeline
        items={patchNotes.map((note) => ({
          key: note.date,
          content: (
            <>
              <Text type="secondary">{dayjs(note.date).format("DD/MM/YYYY")}</Text>
              <Title level={5} className="info-dialog-heading">
                {note.title}
              </Title>
              <ul className="info-dialog-list">
                {note.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </>
          ),
        }))}
      />
    </div>
  );
}

const dialogs: Record<InfoDialog, { title: string; content: ReactNode }> = {
  about: { title: "Về chúng tôi", content: <AboutContent /> },
  "patch-notes": { title: "Ghi chú cập nhật", content: <PatchNotesContent /> },
};

/**
 * "Về chúng tôi" and "Ghi chú cập nhật" items for an antd Dropdown menu,
 * plus the modal they open. Render `modal` next to the Dropdown.
 */
export function useInfoMenu(): { items: NonNullable<MenuProps["items"]>; modal: ReactNode } {
  const [open, setOpen] = useState<InfoDialog | null>(null);
  const dialog = open ? dialogs[open] : null;

  return {
    items: [
      {
        key: "info",
        type: "group",
        label: "Thông tin",
        children: [
          {
            key: "info-about",
            icon: <InfoCircleOutlined />,
            label: "Về chúng tôi",
            onClick: () => setOpen("about"),
          },
          {
            key: "info-patch-notes",
            icon: <ReadOutlined />,
            label: "Ghi chú cập nhật",
            onClick: () => setOpen("patch-notes"),
          },
        ],
      },
    ],
    modal: (
      <Modal
        open={Boolean(dialog)}
        title={dialog?.title}
        footer={null}
        onCancel={() => setOpen(null)}
      >
        {dialog?.content}
      </Modal>
    ),
  };
}
