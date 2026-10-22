"use client";

import { CheckOutlined, LockOutlined } from "@ant-design/icons";
import { Alert, App, Button, Spin, Typography } from "antd";
import { FirebaseError } from "firebase/app";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandMark } from "@/components/brand-mark";
import {
  isFirebaseConfigured,
  missingFirebaseEnvVars,
} from "@/lib/firebase/config";

const { Paragraph, Text, Title } = Typography;

export function AuthGate({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  const { loading, signIn, user } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
        <Alert
          className="w-full"
          type="warning"
          showIcon
          title="Firebase chưa được cấu hình"
          description={
            <div className="space-y-3">
              <p>
                Kết nối Firebase plugin để xác nhận project ID, sau đó sao chép
                cấu hình Web App vào <code>.env.local</code>.
              </p>
              <p className="mb-0">
                Biến còn thiếu: {missingFirebaseEnvVars.join(", ")}
              </p>
            </div>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" description="Đang kiểm tra đăng nhập..." />
      </div>
    );
  }

  if (!user) {
    const handleSignIn = async () => {
      if (signingIn) return;
      setSigningIn(true);
      setPopupBlocked(false);
      try {
        await signIn();
      } catch (error) {
        if (error instanceof FirebaseError) {
          if (error.code === "auth/popup-blocked") {
            setPopupBlocked(true);
            return;
          }
          if (error.code === "auth/popup-closed-by-user") {
            return;
          }
        }
        void message.error(
          error instanceof Error
            ? error.message
            : "Không thể đăng nhập bằng Google.",
        );
      } finally {
        setSigningIn(false);
      }
    };

    return (
      <main className="auth-screen">
        <section className="auth-showcase" aria-hidden="true">
          <div className="auth-showcase-brand">
            <BrandMark size={44} />
            <div>
              <strong>Bo do it</strong>
              <span>For my wife</span>
            </div>
          </div>
          <div className="auth-showcase-copy">
            <h2>Mỗi ngày một trang, gọn gàng và nhẹ nhàng.</h2>
            <p>Lịch học, nhiệm vụ, sự kiện và ghi chú — tất cả nằm chung một planner.</p>
          </div>
          <AuthPreviewCard />
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <BrandMark size={64} className="auth-card-mark" />
            <Text className="auth-eyebrow">Bo do it</Text>
            <Title level={2} className="auth-title">
              Chào mừng trở lại
            </Title>
            <Paragraph type="secondary" className="auth-subtitle">
              Đăng nhập để xem kế hoạch hôm nay và tiếp tục những việc còn dang dở.
            </Paragraph>
            {popupBlocked && (
              <Alert
                className="auth-alert"
                type="warning"
                showIcon
                title="Trình duyệt đã chặn cửa sổ đăng nhập Google"
                description="Hãy cho phép cửa sổ bật lên (pop-up) cho trang web này trong cài đặt trình duyệt, rồi bấm Tiếp tục với Google để thử lại."
              />
            )}
            <Button
              block
              size="large"
              className="auth-google-button"
              icon={signingIn ? undefined : <GoogleMark />}
              loading={signingIn}
              onClick={handleSignIn}
            >
              Tiếp tục với Google
            </Button>
            <p className="auth-footnote">
              <LockOutlined /> Dữ liệu được lưu riêng theo tài khoản Google của bạn.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return children;
}

/** A small, static "Hôm nay" card that hints at what waits after sign-in. */
function AuthPreviewCard() {
  const items = [
    { time: "07:30", title: "Lớp Tiếng Anh", kind: "class" },
    { time: "10:00", title: "Nộp báo cáo tuần", kind: "task", done: true },
    { time: "19:00", title: "Ăn tối cùng gia đình", kind: "event" },
  ] as const;
  return (
    <div className="auth-preview">
      <div className="auth-preview-head">
        <span>Hôm nay</span>
        <strong>3 việc</strong>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.title} className={`is-${item.kind}`}>
            <time>{item.time}</time>
            <span className="auth-preview-title">{item.title}</span>
            {"done" in item ? (
              <span className="auth-preview-check">
                <CheckOutlined />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="auth-preview-note">
        <span>Ghi chú</span>
        Mua hoa cho mẹ 🌷
      </div>
    </div>
  );
}

/** Google's four-colour "G", which the antd outline icon cannot show. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
