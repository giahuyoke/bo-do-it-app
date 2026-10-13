import {
  FieldTimeOutlined,
  FontSizeOutlined,
  OrderedListOutlined,
  ScheduleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ToolKey } from "@/lib/tools/registry";

const icons: Record<ToolKey, typeof FieldTimeOutlined> = {
  timer: FieldTimeOutlined,
  "date-calc": ScheduleOutlined,
  "random-picker": TeamOutlined,
  "word-counter": FontSizeOutlined,
  "line-tools": OrderedListOutlined,
};

export function ToolIcon({ tool }: { tool: ToolKey }) {
  const Icon = icons[tool];
  return <Icon />;
}
