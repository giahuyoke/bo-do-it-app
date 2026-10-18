import "dayjs/locale/vi";
import dayjs, { type Dayjs } from "dayjs";
import { reminderOptions } from "@/lib/planner";

export const historyActions = [
  "create",
  "update",
  "delete",
  "complete",
  "reopen",
  "convert",
  "restore",
] as const;
export const historyEntities = ["task", "event", "tag", "noteItem"] as const;

export type HistoryAction = (typeof historyActions)[number];
export type HistoryEntity = (typeof historyEntities)[number];
/** A document's fields as they were written, with Timestamps read back as Dates. */
export type HistorySnapshot = Record<string, unknown>;

export interface HistoryInput {
  action: HistoryAction;
  entity: HistoryEntity;
  entityId: string;
  title: string;
  before: HistorySnapshot | null;
  after: HistorySnapshot | null;
  /** How many items one save touched; 1 unless a batch created several. */
  count?: number;
}

export interface HistoryEntry extends Omit<HistoryInput, "count"> {
  id: string;
  count: number;
  at: Date;
}

export type HistoryFilter = "all" | HistoryEntity;

export const historyRetentionDays = 30;
const dayMs = 86_400_000;
const titleLimit = 200;

/** The oldest moment the history view still shows. */
export function historyCutoff(now: Date) {
  return new Date(now.getTime() - historyRetentionDays * dayMs);
}

/** When a new entry becomes eligible for Firestore's TTL cleanup. */
export function historyExpiry(now: Date) {
  return new Date(now.getTime() + historyRetentionDays * dayMs);
}

/** Fits a title or checklist line into the rules' 200-character limit. */
export function historyTitle(text: string) {
  return text.trim().slice(0, titleLimit);
}

const none = "Không có";
const statusLabels: Record<string, string> = {
  todo: "Chưa xong",
  in_progress: "Đang làm",
  done: "Đã xong",
};
const priorityLabels: Record<string, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

function formatText(limit?: number) {
  return (value: unknown) => {
    const text = typeof value === "string" ? value : "";
    if (!text) return none;
    return limit && text.length > limit ? `${text.slice(0, limit)}…` : text;
  };
}

function formatDate(value: unknown) {
  return value instanceof Date ? dayjs(value).format("DD/MM/YYYY") : none;
}

function formatReminder(value: unknown) {
  const minutes = typeof value === "number" ? value : -1;
  return reminderOptions.find((option) => option.value === minutes)?.label ?? `${minutes} phút`;
}

function formatLabel(labels: Record<string, string>) {
  return (value: unknown) => labels[String(value)] ?? String(value ?? none);
}

// Order here is the order changes are listed in. `deadline` is folded into
// `startAt` by `normalize`, so a task and an event line up when converted.
const shownFields: Array<{ field: string; label: string; format: (value: unknown) => string }> = [
  { field: "title", label: "Tiêu đề", format: formatText() },
  { field: "name", label: "Tên tag", format: formatText() },
  { field: "text", label: "Nội dung", format: formatText() },
  { field: "description", label: "Ghi chú", format: formatText(80) },
  { field: "location", label: "Địa điểm", format: formatText() },
  { field: "startAt", label: "Bắt đầu", format: formatDate },
  { field: "endAt", label: "Kết thúc", format: formatDate },
  { field: "status", label: "Trạng thái", format: formatLabel(statusLabels) },
  { field: "priority", label: "Ưu tiên", format: formatLabel(priorityLabels) },
  { field: "tagName", label: "Tag", format: formatText() },
  { field: "tagColor", label: "Màu", format: formatText() },
  { field: "color", label: "Màu", format: formatText() },
  { field: "reminderMinutes", label: "Nhắc nhở", format: formatReminder },
];

/** Fields whose values are hex colors, so the view can draw a swatch. */
export const colorFields: ReadonlySet<string> = new Set(["tagColor", "color"]);

export interface FieldChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

function normalize(snapshot: HistorySnapshot): HistorySnapshot {
  if (!("deadline" in snapshot)) return snapshot;
  const { deadline, ...rest } = snapshot;
  return { ...rest, startAt: deadline };
}

function sameValue(a: unknown, b: unknown) {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

/**
 * The shown fields that differ between two snapshots, formatted for reading.
 * A field present on only one side (e.g. a task's priority after converting
 * an event) is skipped rather than shown as appearing from nowhere.
 */
export function diffFields(
  before: HistorySnapshot | null,
  after: HistorySnapshot | null,
): FieldChange[] {
  if (!before || !after) return [];
  const from = normalize(before);
  const to = normalize(after);
  return shownFields.flatMap(({ field, label, format }) =>
    field in from && field in to && !sameValue(from[field], to[field])
      ? [{ field, label, from: format(from[field]), to: format(to[field]) }]
      : [],
  );
}

const nouns: Record<HistoryEntity, string> = {
  task: "nhiệm vụ",
  event: "sự kiện",
  tag: "tag",
  noteItem: "dòng ghi chú",
};

/** One sentence saying what happened, e.g. `Đã xóa nhiệm vụ “Nộp báo cáo”`. */
export function describeEntry(
  entry: Pick<HistoryEntry, "action" | "entity" | "title" | "count">,
): string {
  const noun = nouns[entry.entity];
  const quoted = `“${entry.title}”`;
  const many = entry.count > 1 ? `${entry.count} ` : "";
  switch (entry.action) {
    case "create":
      return `${entry.entity === "noteItem" ? "Đã thêm" : "Đã tạo"} ${many}${noun} ${quoted}`;
    case "update":
      return `Đã sửa ${noun} ${quoted}`;
    case "delete":
      // Ticking a checklist line off is how it gets deleted.
      return `${entry.entity === "noteItem" ? "Đã tích" : "Đã xóa"} ${noun} ${quoted}`;
    case "complete":
      return `Đã hoàn thành ${noun} ${quoted}`;
    case "reopen":
      return `Đã mở lại ${noun} ${quoted}`;
    case "convert": {
      const from = entry.entity === "task" ? nouns.event : nouns.task;
      return `Đã đổi ${from} ${quoted} thành ${many}${noun}`;
    }
    case "restore":
      return `Đã khôi phục ${noun} ${quoted}`;
  }
}

export interface HistoryDay {
  key: string;
  label: string;
  entries: HistoryEntry[];
}

function dayLabel(day: Dayjs, today: Dayjs) {
  if (day.isSame(today, "day")) return "Hôm nay";
  if (day.isSame(today.subtract(1, "day"), "day")) return "Hôm qua";
  const label = day.locale("vi").format("dddd, DD/MM");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Groups newest-first entries by local day, keeping their order. */
export function groupByDay(entries: HistoryEntry[], today: Dayjs): HistoryDay[] {
  const days: HistoryDay[] = [];
  for (const entry of entries) {
    const day = dayjs(entry.at);
    const key = day.format("YYYY-MM-DD");
    const last = days.at(-1);
    if (last?.key === key) {
      last.entries.push(entry);
    } else {
      days.push({ key, label: dayLabel(day, today), entries: [entry] });
    }
  }
  return days;
}

export function filterEntries(
  entries: HistoryEntry[],
  filter: HistoryFilter,
  deletedOnly: boolean,
) {
  return entries.filter(
    (entry) =>
      (filter === "all" || entry.entity === filter) &&
      (!deletedOnly || entry.action === "delete"),
  );
}

/** Identifies an item across kinds, for the set of items currently loaded. */
export function historyItemKey(entity: HistoryEntity, id: string) {
  return `${entity}:${id}`;
}

/** A deleted item can come back while it is still gone from the loaded data. */
export function isRestorable(entry: HistoryEntry, existing: ReadonlySet<string>) {
  return (
    entry.action === "delete" &&
    entry.before !== null &&
    !existing.has(historyItemKey(entry.entity, entry.entityId))
  );
}
