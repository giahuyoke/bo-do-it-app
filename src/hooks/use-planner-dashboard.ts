"use client";

import dayjs, { type Dayjs } from "dayjs";
import { useMemo } from "react";
import type { ItemFilter } from "@/components/dashboard/dashboard-types";
import type { DashboardSection } from "@/components/dashboard/dashboard-sidebar";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import { useRealtimeTags } from "@/hooks/use-realtime-tags";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { plannerItemDate, type PlannerItem } from "@/lib/planner";

interface UsePlannerDashboardOptions {
  userId: string;
  filter: ItemFilter;
  search: string;
  selectedDate: Dayjs;
  section: DashboardSection;
}

export function usePlannerDashboard({
  userId,
  filter,
  search,
  selectedDate,
  section,
}: UsePlannerDashboardOptions) {
  const tasksState = useRealtimeTasks(userId);
  const eventsState = useRealtimeEvents(userId);
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
      if (section === "today" && (!date || !dayjs(date).isSame(today, "day"))) {
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
      today: allItems.filter((item) => {
        const date = plannerItemDate(item);
        return date && dayjs(date).isSame(today, "day");
      }).length,
      upcoming: allItems.filter((item) => {
        const date = plannerItemDate(item);
        return (
          date &&
          dayjs(date).isAfter(today.endOf("day")) &&
          !dayjs(date).isAfter(today.add(7, "day").endOf("day"))
        );
      }).length,
      tasks: tasksState.tasks.filter((task) => task.status !== "done").length,
      completed: tasksState.tasks.filter((task) => task.status === "done").length,
    };
  }, [allItems, tasksState.tasks]);

  const selectedItems = useMemo(
    () =>
      visibleItems
        .filter((item) => {
          const date = plannerItemDate(item);
          return date && dayjs(date).isSame(selectedDate, "day");
        })
        .sort(
          (left, right) =>
            plannerItemDate(left)!.getTime() -
            plannerItemDate(right)!.getTime(),
        ),
    [selectedDate, visibleItems],
  );

  const upcomingItems = useMemo(
    () =>
      visibleItems
        .filter((item) => {
          const date = plannerItemDate(item);
          return date && dayjs(date).isAfter(dayjs().endOf("day"));
        })
        .sort(
          (left, right) =>
            plannerItemDate(left)!.getTime() -
            plannerItemDate(right)!.getTime(),
        )
        .slice(0, 4),
    [visibleItems],
  );

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
    nextReminder,
    selectedItems,
    tagError: tagsState.error,
    taskError: tasksState.error,
    upcomingItems,
    visibleItems,
  };
}
