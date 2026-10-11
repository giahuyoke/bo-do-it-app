import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bo Do It",
  description: "Dự án Next.js với Tailwind CSS và Ant Design.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <style>{"@layer theme, base, antd, components, utilities;"}</style>
      </head>
      <body className="min-h-full font-sans">
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
