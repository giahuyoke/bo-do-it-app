import type { Dayjs } from "dayjs";
import {
  comparePlannerItems,
  plannerItemCoversDay,
  type PlannerItem,
} from "@/lib/planner";

export function todaySections(items: PlannerItem[], today: Dayjs, search = "") {
  const term = search.trim().toLocaleLowerCase("vi");
  const todayItems = items.filter((item) => {
    return plannerItemCoversDay(item, today) &&
      (!term || [item.data.title, item.data.description, item.data.tagName]
        .join(" ").toLocaleLowerCase("vi").includes(term));
  }).sort(comparePlannerItems);

  return {
    pending: todayItems.filter((item) => item.kind === "task" && item.data.status !== "done"),
    completed: todayItems.filter((item) => item.kind === "task" && item.data.status === "done"),
    events: todayItems.filter((item) => item.kind === "event"),
  };
}
