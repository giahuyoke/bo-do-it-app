"use client";

import { App, Button, Card, Tag } from "antd";

export function StarterCard() {
  const { message } = App.useApp();

  return (
    <Card className="w-full max-w-2xl shadow-sm">
      <div className="space-y-6 p-2 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Tag color="blue">Next.js</Tag>
          <Tag color="cyan">Tailwind CSS</Tag>
          <Tag color="purple">Ant Design</Tag>
          <Tag>TypeScript</Tag>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Bo Do It
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Sẵn sàng bắt đầu.
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Next.js đã được cấu hình với Tailwind CSS cho giao diện và Ant
            Design cho các component. Bạn có thể bắt đầu xây dựng ứng dụng ngay.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Chỉnh sửa trang này tại{" "}
          <code className="font-mono text-indigo-600">src/app/page.tsx</code>.
          Tùy chỉnh theme Ant Design tại{" "}
          <code className="font-mono text-indigo-600">
            src/components/providers.tsx
          </code>
          .
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="primary"
            size="large"
            onClick={() => message.success("Ant Design hoạt động thành công!")}
          >
            Kiểm tra Ant Design
          </Button>
          <Button
            size="large"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tài liệu Next.js
          </Button>
        </div>
      </div>
    </Card>
  );
}
