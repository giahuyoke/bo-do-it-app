"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DownOutlined,
  ForwardOutlined,
  SettingOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { Drawer } from "antd";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import { ItemTitle } from "@/components/planner/item-title";
import {
  plannerItemColor,
  plannerItemDate,
  type PlannerItem,
} from "@/lib/planner";

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
  /** Open tasks, already sorted, for the expandable "Nhiệm vụ" preview. */
  pendingTasks: PlannerItem[];
  onNavigate: (section: DashboardSection) => void;
  onOpenItem: (item: PlannerItem) => void;
}

interface NavigationEntry {
  key: DashboardSection;
  icon: ReactNode;
  label: string;
  countKey?: keyof DashboardCounts;
}

const taskPreviewLimit = 6;

// Planner (the calendar with every item) stands alone; the groups below it
// are narrower views. An empty label renders a group without a heading.
const navigationGroups: Array<{ label: string; entries: NavigationEntry[] }> = [
  {
    label: "",
    entries: [{ key: "planner", icon: <CalendarOutlined />, label: "Planner" }],
  },
  {
    label: "Lịch trình",
    entries: [
      {
        key: "today",
        icon: <ClockCircleOutlined />,
        label: "Hôm nay",
        countKey: "today",
      },
      {
        key: "upcoming",
        icon: <ForwardOutlined />,
        label: "Sắp tới",
        countKey: "upcoming",
      },
    ],
  },
  {
    label: "Công việc",
    entries: [
      {
        key: "tasks",
        icon: <CheckSquareOutlined />,
        label: "Nhiệm vụ",
        countKey: "tasks",
      },
      {
        key: "completed",
        icon: <CheckCircleOutlined />,
        label: "Đã hoàn thành",
        countKey: "completed",
      },
    ],
  },
  {
    label: "",
    entries: [{ key: "tags", icon: <TagsOutlined />, label: "Quản lý tag" }],
  },
];

function TaskPreview({
  tasks,
  onNavigate,
  onOpenItem,
}: Pick<NavigationProps, "onNavigate" | "onOpenItem"> & {
  tasks: PlannerItem[];
}) {
  if (!tasks.length) {
    return (
      <p className="planner-task-preview-empty">Không có nhiệm vụ đang chờ.</p>
    );
  }

  return (
    <ul className="planner-task-preview" id="planner-task-preview">
      {tasks.slice(0, taskPreviewLimit).map((item) => {
        const date = plannerItemDate(item);
        return (
          <li key={item.data.id}>
            <button type="button" onClick={() => onOpenItem(item)}>
              <i style={{ backgroundColor: plannerItemColor(item) }} />
              <ItemTitle
                title={item.data.title}
                completed={false}
                className="truncate"
              />
              {date ? <time>{dayjs(date).format("DD/MM")}</time> : null}
            </button>
          </li>
        );
      })}
      {tasks.length > taskPreviewLimit ? (
        <li>
          <button
            type="button"
            className="planner-task-preview-more"
            onClick={() => onNavigate("tasks")}
          >
            Xem tất cả {tasks.length} nhiệm vụ
          </button>
        </li>
      ) : null}
    </ul>
  );
}

function DashboardNavigation({
  activeSection,
  counts,
  pendingTasks,
  onNavigate,
  onOpenItem,
}: NavigationProps) {
  // Open by default so pending tasks are visible at a glance.
  const [tasksExpanded, setTasksExpanded] = useState(true);

  return (
    <nav className="planner-side-nav" aria-label="Điều hướng chính">
      {navigationGroups.map((group, index) => (
        <div className="planner-nav-group" key={group.label || index}>
          {group.label ? (
            <span className="planner-nav-heading">{group.label}</span>
          ) : null}
          {group.entries.map((entry) => {
            const button = (
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
                  <span className="planner-nav-count">
                    {counts[entry.countKey]}
                  </span>
                ) : null}
              </button>
            );
            if (entry.key !== "tasks") return button;

            return (
              <div key={entry.key} className="planner-nav-expandable">
                <div className="planner-nav-row">
                  {button}
                  <button
                    type="button"
                    className={`planner-nav-toggle ${tasksExpanded ? "is-open" : ""}`}
                    aria-expanded={tasksExpanded}
                    aria-controls="planner-task-preview"
                    aria-label={
                      tasksExpanded ? "Thu gọn nhiệm vụ" : "Xem nhanh nhiệm vụ"
                    }
                    onClick={() => setTasksExpanded((open) => !open)}
                  >
                    <DownOutlined />
                  </button>
                </div>
                {tasksExpanded ? (
                  <TaskPreview
                    tasks={pendingTasks}
                    onNavigate={onNavigate}
                    onOpenItem={onOpenItem}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function MobileBottomNavigation({
  activeSection,
  onNavigate,
}: Pick<NavigationProps, "activeSection" | "onNavigate">) {
  const entries = [
    { key: "planner" as const, icon: <CalendarOutlined />, label: "Lịch" },
    { key: "today" as const, icon: <ClockCircleOutlined />, label: "Hôm nay" },
    {
      key: "tasks" as const,
      icon: <CheckSquareOutlined />,
      label: "Công việc",
    },
    { key: "tags" as const, icon: <TagsOutlined />, label: "Quản lý tag" },
  ];
  return (
    <nav className="planner-bottom-nav" aria-label="Điều hướng điện thoại">
      {entries.map((entry) => (
        <button
          key={entry.key}
          type="button"
          className={activeSection === entry.key ? "is-active" : ""}
          aria-current={activeSection === entry.key ? "page" : undefined}
          onClick={() => onNavigate(entry.key)}
        >
          {entry.icon}
          <span>{entry.label}</span>
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
  pendingTasks,
  onNavigate,
  onOpenItem,
  onOpenSettings,
}: DashboardSidebarProps) {
  return (
    <aside className="planner-sidebar">
      <div className="planner-brand">
        <span className="planner-logo">B</span>
        <div>
          <strong>Bo do it</strong>
          <span>For my wife</span>
        </div>
      </div>

      <DashboardNavigation
        activeSection={activeSection}
        counts={counts}
        pendingTasks={pendingTasks}
        onNavigate={onNavigate}
        onOpenItem={onOpenItem}
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
  pendingTasks,
  open,
  onClose,
  onNavigate,
  onOpenItem,
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
        pendingTasks={pendingTasks}
        onNavigate={onNavigate}
        onOpenItem={(item) => {
          onClose();
          onOpenItem(item);
        }}
      />
    </Drawer>
  );
}
