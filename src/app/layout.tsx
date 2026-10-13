import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Providers } from "@/components/providers";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

const font = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vietnam",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
};

export const metadata: Metadata = {
  title: "Bo Do It",
  description: "Planner cá nhân trực quan cho lịch trình và nhiệm vụ hằng ngày.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The boot script sets data-theme before hydration; React must keep it.
    <html
      lang="vi"
      data-theme="light"
      className={`${font.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <style>{"@layer theme, base, antd, components, utilities;"}</style>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full font-sans">
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
