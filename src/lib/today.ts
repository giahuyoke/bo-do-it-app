import dayjs, { type Dayjs } from "dayjs";
import {
  comparePlannerItems,
  plannerItemDate,
  type PlannerItem,
} from "@/lib/planner";

export function todaySections(items: PlannerItem[], today: Dayjs, search = "") {
  const term = search.trim().toLocaleLowerCase("vi");
  const todayItems = items.filter((item) => {
    const date = plannerItemDate(item);
    return date && dayjs(date).isSame(today, "day") &&
      (!term || [item.data.title, item.data.description, item.data.tagName]
        .join(" ").toLocaleLowerCase("vi").includes(term));
  }).sort(comparePlannerItems);

  return {
    pending: todayItems.filter((item) => item.kind === "task" && item.data.status !== "done"),
    completed: todayItems.filter((item) => item.kind === "task" && item.data.status === "done"),
    events: todayItems.filter((item) => item.kind === "event"),
  };
}
