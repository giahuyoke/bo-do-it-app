import type { Dayjs } from "dayjs";

export type PlannerFormItemType = "event" | "task";

export interface PlannerFormValues {
  type: PlannerFormItemType;
  title: string;
  startAt?: Dayjs | null;
  endAt?: Dayjs | null;
  color?: string;
  completed?: boolean;
  reminderMinutes: number;
  tagId?: string;
  note?: string;
}
