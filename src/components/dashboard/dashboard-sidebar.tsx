"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DownOutlined,
  FormOutlined,
  ForwardOutlined,
  HistoryOutlined,
  SettingOutlined,
  TagsOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Drawer, Dropdown } from "antd";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import { ItemTitle } from "@/components/planner/item-title";
import { ToolIcon } from "@/components/tools/tool-icon";
import { useThemeMenuItems } from "@/components/theme-menu";
import { useTheme } from "@/components/theme-provider";
import { itemPalette } from "@/lib/color-contrast";
import {
  plannerItemColor,
  plannerItemDate,
  type PlannerItem,
} from "@/lib/planner";
import { toolInfo, type ToolKey } from "@/lib/tools/registry";

export type DashboardSection =
  | "planner"
  | "notes"
  | "today"
  | "upcoming"
  | "tasks"
  | "completed"
  | "tags"
  | "tools"
  | "history";

export interface DashboardCounts {
  /** Lines left on the notes checklist. */
  notes: number;
  today: number;
  upcoming: number;
  tasks: number;
  completed: number;
}

interface NavigationProps {
  activeSection: DashboardSection;
  counts: DashboardCounts;
  /** Open tasks due in the next 7 days, sorted, for the "Nhiệm vụ" preview. */
  pendingTasks: PlannerItem[];
  /** Tools pinned to the sidebar, in pin order. */
  pinnedTools: readonly ToolKey[];
  /** The open tool, or null on the tools list (or outside "Công cụ"). */
  activeTool: ToolKey | null;
  onNavigate: (section: DashboardSection) => void;
  onOpenItem: (item: PlannerItem) => void;
  onOpenTool: (tool: ToolKey) => void;
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
    entries: [
      { key: "planner", icon: <CalendarOutlined />, label: "Planner" },
      { key: "notes", icon: <FormOutlined />, label: "Ghi chú", countKey: "notes" },
    ],
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
    entries: [
      { key: "tools", icon: <ToolOutlined />, label: "Công cụ" },
      { key: "tags", icon: <TagsOutlined />, label: "Quản lý tag" },
      { key: "history", icon: <HistoryOutlined />, label: "Lịch sử" },
    ],
  },
];

function TaskPreview({
  tasks,
  onNavigate,
  onOpenItem,
}: Pick<NavigationProps, "onNavigate" | "onOpenItem"> & {
  tasks: PlannerItem[];
}) {
  const { theme } = useTheme();
  if (!tasks.length) {
    return (
      <p className="planner-task-preview-empty">Không có nhiệm vụ trong 7 ngày tới.</p>
    );
  }

  return (
    <ul className="planner-task-preview" id="planner-task-preview">
      {tasks.slice(0, taskPreviewLimit).map((item) => {
        const date = plannerItemDate(item);
        return (
          <li key={item.data.id}>
            <button type="button" onClick={() => onOpenItem(item)}>
              <i style={{ backgroundColor: itemPalette(plannerItemColor(item), theme).accent }} />
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
            Xem tất cả nhiệm vụ
          </button>
        </li>
      ) : null}
    </ul>
  );
}

function PinnedTools({
  tools,
  activeTool,
  onOpenTool,
}: {
  tools: readonly ToolKey[];
  activeTool: ToolKey | null;
  onOpenTool: (tool: ToolKey) => void;
}) {
  return (
    <ul className="planner-task-preview planner-pinned-tools" id="planner-pinned-tools">
      {tools.map((tool) => (
        <li key={tool}>
          <button
            type="button"
            className={tool === activeTool ? "is-active" : ""}
            aria-current={tool === activeTool ? "page" : undefined}
            onClick={() => onOpenTool(tool)}
          >
            <ToolIcon tool={tool} />
            <span className="truncate">{toolInfo(tool).name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DashboardNavigation({
  activeSection,
  counts,
  pendingTasks,
  pinnedTools,
  activeTool,
  onNavigate,
  onOpenItem,
  onOpenTool,
}: NavigationProps) {
  // Open by default so pending tasks are visible at a glance.
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  // An open pinned tool is highlighted in the submenu instead of its parent.
  const openPinnedTool =
    activeSection === "tools" && activeTool && pinnedTools.includes(activeTool)
      ? activeTool
      : null;

  return (
    <nav className="planner-side-nav" aria-label="Điều hướng chính">
      {navigationGroups.map((group, index) => (
        <div className="planner-nav-group" key={group.label || index}>
          {group.label ? (
            <span className="planner-nav-heading">{group.label}</span>
          ) : null}
          {group.entries.map((entry) => {
            const active =
              entry.key === activeSection && !(entry.key === "tools" && openPinnedTool);
            const button = (
              <button
                type="button"
                key={entry.key}
                className={active ? "is-active" : ""}
                aria-current={active ? "page" : undefined}
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
            if (entry.key === "tools" && pinnedTools.length) {
              return (
                <div key={entry.key} className="planner-nav-expandable">
                  <div className="planner-nav-row">
                    {button}
                    <button
                      type="button"
                      className={`planner-nav-toggle ${toolsExpanded ? "is-open" : ""}`}
                      aria-expanded={toolsExpanded}
                      aria-controls="planner-pinned-tools"
                      aria-label={
                        toolsExpanded ? "Thu gọn công cụ đã ghim" : "Xem công cụ đã ghim"
                      }
                      onClick={() => setToolsExpanded((open) => !open)}
                    >
                      <DownOutlined />
                    </button>
                  </div>
                  {toolsExpanded ? (
                    <PinnedTools
                      tools={pinnedTools}
                      activeTool={openPinnedTool}
                      onOpenTool={onOpenTool}
                    />
                  ) : null}
                </div>
              );
            }
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
    // Tags stay reachable from the menu; notes are the everyday stop.
    { key: "notes" as const, icon: <FormOutlined />, label: "Ghi chú" },
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

export function DashboardSidebar(props: NavigationProps) {
  const themeItems = useThemeMenuItems();
  return (
    <aside className="planner-sidebar">
      <div className="planner-sidebar-scroll">
        <div className="planner-brand">
          <span className="planner-logo">B</span>
          <div>
            <strong>Bo do it</strong>
            <span>For my wife</span>
          </div>
        </div>

        <DashboardNavigation {...props} />

        <div className="planner-sidebar-card">
          <span className="planner-sidebar-card-icon">✦</span>
          <strong>Một ngày thật nhẹ</strong>
          <p>Chọn ba việc quan trọng nhất và bắt đầu từ việc nhỏ.</p>
        </div>
      </div>

      <Dropdown trigger={["click"]} placement="topLeft" menu={{ items: themeItems }}>
        <button type="button" className="planner-settings-link">
          <SettingOutlined /> Cài đặt
        </button>
      </Dropdown>
    </aside>
  );
}

interface MobileDashboardNavigationProps extends NavigationProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDashboardNavigation({
  open,
  onClose,
  onOpenItem,
  ...navigation
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
        {...navigation}
        onOpenItem={(item) => {
          onClose();
          onOpenItem(item);
        }}
      />
    </Drawer>
  );
}
