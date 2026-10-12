import type { Dayjs } from "dayjs";

export type PlannerFormItemType = "event" | "task";

export interface ScheduleRangeValue {
  startAt?: Dayjs | null;
  endAt?: Dayjs | null;
}

export interface PlannerFormValues {
  type: PlannerFormItemType;
  title: string;
  /** One plan is saved per range; the first is the item being edited. */
  ranges: ScheduleRangeValue[];
  color?: string;
  completed?: boolean;
  reminderMinutes: number;
  tagId?: string;
  note?: string;
}
