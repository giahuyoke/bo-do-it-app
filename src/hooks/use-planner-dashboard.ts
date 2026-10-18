"use client";

import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import type { ItemFilter } from "@/components/dashboard/dashboard-types";
import type { DashboardSection } from "@/components/dashboard/dashboard-sidebar";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import { useRealtimeTags } from "@/hooks/use-realtime-tags";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { plannerMonths } from "@/lib/load-window";
import {
  compareByCreation,
  comparePlannerItems,
  plannerItemCoversDay,
  plannerItemOverlaps,
  plannerItemDate,
  type PlannerItem,
} from "@/lib/planner";

interface UsePlannerDashboardOptions {
  userId: string;
  filter: ItemFilter;
  search: string;
  selectedDate: Dayjs;
  /** The month or week the calendar shows; its months get loaded. */
  visibleDate: Dayjs;
  section: DashboardSection;
}

export function usePlannerDashboard({
  userId,
  filter,
  search,
  selectedDate,
  visibleDate,
  section,
}: UsePlannerDashboardOptions) {
  // Only months around today and around what the calendar shows are loaded;
  // "load all" adds the newest tasks and earliest events of any date on top.
  const [loadAll, setLoadAll] = useState({ userId: "", on: false });
  const allRequested = loadAll.on && loadAll.userId === userId;
  const todayKey = dayjs().format("YYYY-MM-DD");
  const visibleKey = visibleDate.format("YYYY-MM");
  const selectedKey = selectedDate.format("YYYY-MM");
  const months = useMemo(
    () => plannerMonths(dayjs(todayKey), dayjs(`${visibleKey}-01`), dayjs(`${selectedKey}-01`)),
    [todayKey, visibleKey, selectedKey],
  );
  const tasksState = useRealtimeTasks(userId, months, allRequested);
  const eventsState = useRealtimeEvents(userId, months, allRequested);
  const tagsState = useRealtimeTags(userId);

  const allTags = tagsState.tags;

  const allItems = useMemo<PlannerItem[]>(
    () => [
      ...tasksState.tasks.map((task) => ({
        kind: "task" as const,
        date: task.deadline,
        data: task,
      })),
      ...eventsState.events.map((event) => ({
        kind: "event" as const,
        date: event.startAt,
        data: event,
      })),
    ],
    [eventsState.events, tasksState.tasks],
  );

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi");
    const today = dayjs();
    return allItems.filter((item) => {
      const date = plannerItemDate(item);
      if (section === "today" && !plannerItemCoversDay(item, today)) {
        return false;
      }
      if (
        section === "upcoming" &&
        (!date ||
          !dayjs(date).isAfter(today.endOf("day")) ||
          dayjs(date).isAfter(today.add(7, "day").endOf("day")))
      ) {
        return false;
      }
      if (
        section === "tasks" &&
        (item.kind !== "task" || item.data.status === "done")
      ) {
        return false;
      }
      if (
        section === "completed" &&
        (item.kind !== "task" || item.data.status !== "done")
      ) {
        return false;
      }
      if (filter !== "all" && item.kind !== filter) return false;
      if (!normalizedSearch) return true;
      return [item.data.title, item.data.description, item.data.tagName]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(normalizedSearch);
    });
  }, [allItems, filter, search, section]);

  const counts = useMemo(() => {
    const today = dayjs();
    return {
      today: allItems.filter((item) => plannerItemCoversDay(item, today)).length,
      upcoming: allItems.filter((item) => {
        const date = plannerItemDate(item);
        return (
          date &&
          dayjs(date).isAfter(today.endOf("day")) &&
          !dayjs(date).isAfter(today.add(7, "day").endOf("day"))
        );
      }).length,
      tasks: tasksState.tasks.filter((task) => task.status !== "done").length,
      completed: tasksState.doneCount,
    };
  }, [allItems, tasksState.tasks, tasksState.doneCount]);

  const selectedItems = useMemo(
    () =>
      visibleItems
        .filter((item) => plannerItemCoversDay(item, selectedDate))
        .sort(compareByCreation),
    [selectedDate, visibleItems],
  );

  const upcomingItems = useMemo(
    () =>
      visibleItems
        .filter((item) => {
          const date = plannerItemDate(item);
          return date && dayjs(date).isAfter(dayjs().endOf("day"));
        })
        .sort(comparePlannerItems)
        .slice(0, 4),
    [visibleItems],
  );

  // Sidebar preview: open tasks falling anywhere from today to 7 days ahead.
  const pendingTasks = useMemo(() => {
    const today = dayjs();
    return allItems
      .filter(
        (item) =>
          item.kind === "task" &&
          item.data.status !== "done" &&
          plannerItemOverlaps(item, today, today.add(7, "day")),
      )
      .sort(comparePlannerItems);
  }, [allItems]);

  const nextReminder = useMemo(
    () =>
      allItems
        .filter(
          (item) =>
            item.data.reminderMinutes !== null && plannerItemDate(item),
        )
        .sort(
          (left, right) =>
            plannerItemDate(left)!.getTime() -
            plannerItemDate(right)!.getTime(),
        )
        .find((item) => dayjs(plannerItemDate(item)).isAfter(dayjs())),
    [allItems],
  );

  return {
    allItems,
    allTags,
    customTags: tagsState.tags,
    counts,
    eventError: eventsState.error,
    loading: tasksState.loading || eventsState.loading,
    fetching: tasksState.fetching || eventsState.fetching,
    /** True once "load all" was asked for; plans outside the loaded months may be missing until then. */
    allRequested,
    loadAll: () => setLoadAll({ userId, on: true }),
    nextReminder,
    pendingTasks,
    selectedItems,
    tagError: tagsState.error,
    taskError: tasksState.error,
    upcomingItems,
    visibleItems,
  };
}
