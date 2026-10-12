import type { Dayjs } from "dayjs";
import type { PlannerView } from "@/components/planner/planner-calendar";
import type { PlannerItem } from "@/lib/planner";

export type ItemFilter = "all" | "event" | "task";
export type PlannerItemType = "event" | "task";

export interface PlannerDrawerState {
  open: boolean;
  type: PlannerItemType;
  item: PlannerItem | null;
  /** Prefills a new plan's title, e.g. when turning a checklist line into a task. */
  initialTitle?: string;
  /** Runs once the new plan is saved, e.g. to tick the checklist line off. */
  onCreated?: () => void;
}

export interface PlannerNavigationState {
  selectedDate: Dayjs;
  visibleDate: Dayjs;
  view: PlannerView;
  filter: ItemFilter;
  search: string;
}
