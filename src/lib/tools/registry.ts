export type ToolKey =
  | "timer"
  | "date-calc"
  | "random-picker"
  | "word-counter"
  | "line-tools";

export interface ToolInfo {
  key: ToolKey;
  name: string;
  description: string;
}

/** Every tool, in the order the tools page lists them. */
export const tools: readonly ToolInfo[] = [
  {
    key: "timer",
    name: "Bấm giờ / Đếm ngược",
    description: "Bấm giờ nhanh hoặc đếm ngược tới một mốc thời gian, có báo khi hết giờ.",
  },
  {
    key: "date-calc",
    name: "Tính ngày",
    description: "Cộng/trừ ngày, đếm số ngày và số ngày làm việc giữa hai mốc.",
  },
  {
    key: "random-picker",
    name: "Bốc thăm / Chia nhóm",
    description: "Dán danh sách tên, bốc ngẫu nhiên vài người hoặc chia đều thành nhóm.",
  },
  {
    key: "word-counter",
    name: "Đếm chữ",
    description: "Đếm ký tự, từ, dòng, câu và ước tính thời gian đọc.",
  },
  {
    key: "line-tools",
    name: "Xử lý dòng",
    description: "Sắp xếp, bỏ trùng, xáo trộn, thêm tiền tố/hậu tố cho từng dòng.",
  },
];

const toolsByKey = new Map(tools.map((tool) => [tool.key, tool]));

export function isToolKey(value: unknown): value is ToolKey {
  return typeof value === "string" && toolsByKey.has(value as ToolKey);
}

export function toolInfo(key: ToolKey): ToolInfo {
  return toolsByKey.get(key)!;
}
