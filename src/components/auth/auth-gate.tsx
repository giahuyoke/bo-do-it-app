"use client";

import { GoogleOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Spin, Typography } from "antd";
import { FirebaseError } from "firebase/app";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
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
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
        <div className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-amber-100/60 blur-3xl dark:bg-amber-400/10" />
        <div className="absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-yellow-100/60 blur-3xl dark:bg-yellow-300/8" />
        <Card className="relative w-full max-w-md border-white/70! dark:border-white/10! shadow-[0_24px_70px_rgba(63,105,83,0.12)]!">
          <div className="space-y-7 p-3 text-center sm:p-6">
            <div>
              <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl rounded-bl-md bg-linear-to-br from-amber-200 to-yellow-400 text-xl font-semibold text-yellow-900 shadow-lg shadow-amber-100 dark:shadow-amber-950">
                B
              </span>
              <Text className="font-medium uppercase tracking-[0.2em] text-yellow-800! dark:text-amber-300!">
                Bo-Do-It
              </Text>
              <Title level={2} className="mb-2! mt-3!">
                Ngày mới, kế hoạch nhẹ nhàng
              </Title>
              <Paragraph type="secondary">
                Lịch trình và nhiệm vụ của bạn được sắp xếp trực quan trong một planner duy nhất.
              </Paragraph>
            </div>
            {popupBlocked && (
              <Alert
                type="warning"
                showIcon
                title="Trình duyệt đã chặn cửa sổ đăng nhập Google"
                description="Hãy cho phép cửa sổ bật lên (pop-up) cho trang web này trong cài đặt trình duyệt, rồi bấm Tiếp tục với Google để thử lại."
              />
            )}
            <Button
              block
              type="primary"
              size="large"
              icon={<GoogleOutlined />}
              loading={signingIn}
              onClick={async () => {
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
              }}
            >
              Tiếp tục với Google
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return children;
}
