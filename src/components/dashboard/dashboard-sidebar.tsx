"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  ForwardOutlined,
  SettingOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { Drawer } from "antd";
import type { ReactNode } from "react";

export type DashboardSection =
  | "planner"
  | "today"
  | "upcoming"
  | "tasks"
  | "completed"
  | "tags";

export interface DashboardCounts {
  today: number;
  upcoming: number;
  tasks: number;
  completed: number;
}

interface NavigationProps {
  activeSection: DashboardSection;
  counts: DashboardCounts;
  onNavigate: (section: DashboardSection) => void;
}

const navigationGroups: Array<{
  label: string;
  entries: Array<{
    key: DashboardSection;
    icon: ReactNode;
    label: string;
    countKey?: keyof DashboardCounts;
  }>;
}> = [
  {
    label: "Kế hoạch",
    entries: [
      { key: "planner", icon: <CalendarOutlined />, label: "Planner" },
      { key: "today", icon: <ClockCircleOutlined />, label: "Hôm nay", countKey: "today" },
      { key: "upcoming", icon: <ForwardOutlined />, label: "Sắp tới", countKey: "upcoming" },
    ],
  },
  {
    label: "Công việc",
    entries: [
      { key: "tasks", icon: <CheckSquareOutlined />, label: "Việc cần làm", countKey: "tasks" },
      { key: "completed", icon: <CheckCircleOutlined />, label: "Đã hoàn thành" },
    ],
  },
  {
    label: "",
    entries: [{ key: "tags", icon: <TagsOutlined />, label: "Quản lý tag" }],
  },
];

function DashboardNavigation({
  activeSection,
  counts,
  onNavigate,
}: NavigationProps) {
  return (
    <nav className="planner-side-nav" aria-label="Điều hướng chính">
      {navigationGroups.map((group) => (
        <div className="planner-nav-group" key={group.label || "tags"}>
          {group.label ? <span className="planner-nav-heading">{group.label}</span> : null}
          {group.entries.map((entry) => (
            <button
              type="button"
              key={entry.key}
              className={entry.key === activeSection ? "is-active" : ""}
              aria-current={entry.key === activeSection ? "page" : undefined}
              onClick={() => onNavigate(entry.key)}
            >
              {entry.icon}
              <span className="planner-nav-label">{entry.label}</span>
              {entry.countKey ? (
                <span className="planner-nav-count">{counts[entry.countKey]}</span>
              ) : null}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function MobileBottomNavigation({ activeSection, onNavigate }: Pick<NavigationProps, "activeSection" | "onNavigate">) {
  const entries = [
    { key: "planner" as const, icon: <CalendarOutlined />, label: "Lịch" },
    { key: "today" as const, icon: <ClockCircleOutlined />, label: "Hôm nay" },
    { key: "tasks" as const, icon: <CheckSquareOutlined />, label: "Công việc" },
    { key: "tags" as const, icon: <TagsOutlined />, label: "Quản lý tag" },
  ];
  return (
    <nav className="planner-bottom-nav" aria-label="Điều hướng điện thoại">
      {entries.map((entry) => (
        <button key={entry.key} type="button" className={activeSection === entry.key ? "is-active" : ""}
          aria-current={activeSection === entry.key ? "page" : undefined} onClick={() => onNavigate(entry.key)}>
          {entry.icon}<span>{entry.label}</span>
        </button>
      ))}
    </nav>
  );
}

interface DashboardSidebarProps extends NavigationProps {
  onOpenSettings: () => void;
}

export function DashboardSidebar({
  activeSection,
  counts,
  onNavigate,
  onOpenSettings,
}: DashboardSidebarProps) {
  return (
    <aside className="planner-sidebar">
      <div className="planner-brand">
        <span className="planner-logo">B</span>
        <div>
          <strong>Bo-Do-It</strong>
          <span>Simple planner</span>
        </div>
      </div>

      <DashboardNavigation
        activeSection={activeSection}
        counts={counts}
        onNavigate={onNavigate}
      />

      <div className="planner-sidebar-card">
        <span className="planner-sidebar-card-icon">✦</span>
        <strong>Một ngày thật nhẹ</strong>
        <p>Chọn ba việc quan trọng nhất và bắt đầu từ việc nhỏ.</p>
      </div>

      <button
        type="button"
        className="planner-settings-link"
        onClick={onOpenSettings}
      >
        <SettingOutlined /> Cài đặt
      </button>
    </aside>
  );
}

interface MobileDashboardNavigationProps extends NavigationProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDashboardNavigation({
  activeSection,
  counts,
  open,
  onClose,
  onNavigate,
}: MobileDashboardNavigationProps) {
  return (
    <Drawer
      title="Bo-Do-It"
      placement="left"
      size={280}
      open={open}
      onClose={onClose}
    >
      <DashboardNavigation
        activeSection={activeSection}
        counts={counts}
        onNavigate={onNavigate}
      />
    </Drawer>
  );
}
