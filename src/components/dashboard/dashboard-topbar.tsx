"use client";

import { MenuOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Input, Typography } from "antd";
import type { User } from "firebase/auth";
import { useThemeMenuItems } from "@/components/theme-menu";

const { Text, Title } = Typography;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

interface DashboardTopbarProps {
  user: User;
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onOpenMobileNavigation: () => void;
  onSignOut: () => void;
}

export function DashboardTopbar({
  user,
  search,
  onSearchChange,
  onAdd,
  onOpenMobileNavigation,
  onSignOut,
}: DashboardTopbarProps) {
  const themeItems = useThemeMenuItems();
  return (
    <header className="planner-topbar">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          className="planner-mobile-menu"
          type="text"
          icon={<MenuOutlined />}
          aria-label="Mở menu"
          onClick={onOpenMobileNavigation}
        />
        <div className="min-w-0">
          <Text className="planner-eyebrow">{greeting()}</Text>
          <Title level={3} className="planner-title">
            {user.displayName?.split(" ").slice(-1)[0] ?? "Bạn"}, hôm nay thế nào?
          </Title>
        </div>
      </div>

      <div className="planner-top-actions">
        <Input
          allowClear
          value={search}
          prefix={<SearchOutlined className="text-ink-faint" />}
          placeholder="Tìm trong planner..."
          aria-label="Tìm kế hoạch"
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          aria-label="Thêm kế hoạch mới"
          onClick={onAdd}
        >
          Thêm mới
        </Button>
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "email",
                disabled: true,
                label: user.email ?? "Tài khoản Google",
              },
              { type: "divider" },
              ...themeItems,
              { type: "divider" },
              {
                key: "logout",
                danger: true,
                label: "Đăng xuất",
                onClick: onSignOut,
              },
            ],
          }}
        >
          <button
            type="button"
            className="planner-avatar-button"
            aria-label="Mở tài khoản"
          >
            <Avatar src={user.photoURL} size={40}>
              {user.displayName?.slice(0, 1).toUpperCase() ?? "U"}
            </Avatar>
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
