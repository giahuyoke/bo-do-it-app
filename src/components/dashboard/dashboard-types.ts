import type { Dayjs } from "dayjs";
import type { PlannerView } from "@/components/planner/planner-calendar";
import type { PlannerItem } from "@/lib/planner";

export type ItemFilter = "all" | "event" | "task";
export type PlannerItemType = "event" | "task";

export interface PlannerDrawerState {
  open: boolean;
  type: PlannerItemType;
  item: PlannerItem | null;
}

export interface PlannerNavigationState {
  selectedDate: Dayjs;
  visibleDate: Dayjs;
  view: PlannerView;
  filter: ItemFilter;
  search: string;
}
