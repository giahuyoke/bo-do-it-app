"use client";

import { Alert, App, Skeleton } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CalendarToolbar } from "@/components/dashboard/calendar-toolbar";
import {
  DashboardSidebar,
  MobileDashboardNavigation,
  MobileBottomNavigation,
  type DashboardSection,
} from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type {
  ItemFilter,
  PlannerDrawerState,
  PlannerItemType,
} from "@/components/dashboard/dashboard-types";
import { PlannerSidePanel } from "@/components/dashboard/planner-side-panel";
import { TodayPanel } from "@/components/dashboard/today-panel";
import {
  PlannerCalendar,
  type PlannerView,
} from "@/components/planner/planner-calendar";
import { ClassScheduleModal } from "@/components/planner/class-schedule-modal";
import { QuickAddDrawer } from "@/components/planner/quick-add-drawer";
import { TagManagerModal } from "@/components/planner/tag-manager-modal";
import { NotesPage } from "@/components/notes/notes-page";
import { CountdownAlarm } from "@/components/tools/countdown-alarm";
import { ToolsPage } from "@/components/tools/tools-page";
import { usePinnedTools } from "@/hooks/use-pinned-tools";
import { usePlannerDashboard } from "@/hooks/use-planner-dashboard";
import { useRealtimeChecklist } from "@/hooks/use-realtime-notes";
import type { NoteItem } from "@/lib/firebase/models";
import { removeChecklistItem } from "@/lib/firebase/notes";
import type { PlannerItem } from "@/lib/planner";
import { setTaskCompleted } from "@/lib/firebase/tasks";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import type { ToolKey } from "@/lib/tools/registry";

const initialDrawerState: PlannerDrawerState = {
  open: false,
  type: "event",
  item: null,
};

export function Dashboard() {
  const { message } = App.useApp();
  const { signOut, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [visibleDate, setVisibleDate] = useState(dayjs());
  const [view, setView] = useState<PlannerView>("month");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("planner");
  const [drawer, setDrawer] =
    useState<PlannerDrawerState>(initialDrawerState);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [classScheduleOpen, setClassScheduleOpen] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const pinnedTools = usePinnedTools();

  const planner = usePlannerDashboard({
    userId: user?.uid ?? "",
    filter,
    search,
    selectedDate,
    section: activeSection,
  });
  const checklist = useRealtimeChecklist(user?.uid ?? "");

  if (!user) return null;

  const counts = {
    ...planner.counts,
    notes: checklist.items.length,
  };

  const upcomingWindow = activeSection === "upcoming" && view === "agenda";

  const closeMobileNavigation = () => setMobileNavigationOpen(false);

  const selectDate = (date: Dayjs) => {
    setSelectedDate(date);
    setVisibleDate(date);
  };

  const goToToday = () => {
    const today = dayjs();
    setSelectedDate(today);
    setVisibleDate(today);
    setView("month");
  };

  const navigate = (section: DashboardSection) => {
    setActiveSection(section);
    setFilter("all");
    setActiveTool(null);
    closeMobileNavigation();

    if (section === "today") {
      goToToday();
      return;
    }

    if (section === "planner") {
      setView("month");
      setFilter("all");
      return;
    }

    if (section === "upcoming") {
      setSelectedDate(dayjs());
      setView("agenda");
      setFilter("all");
      return;
    }

    if (section === "tasks" || section === "completed") {
      // The list follows the toolbar's month, so open on the current one.
      setVisibleDate(dayjs());
      setView("agenda");
      setFilter("task");
      return;
    }

  };

  const openTool = (tool: ToolKey | null) => {
    setActiveSection("tools");
    setActiveTool(tool);
    closeMobileNavigation();
  };

  const openCreate = (type: PlannerItemType, date = selectedDate) => {
    setSelectedDate(date);
    setDrawer({ open: true, type, item: null });
  };

  // A checklist line becomes a task for the selected day; once that task is
  // saved, the line is ticked off the checklist.
  const convertNoteItem = (item: NoteItem) => {
    setDrawer({
      open: true,
      type: "task",
      item: null,
      initialTitle: item.text,
      onCreated: () =>
        void removeChecklistItem(user.uid, item.id).catch((error: unknown) =>
          message.error(firebaseErrorMessage(error, "Không thể cập nhật checklist.")),
        ),
    });
  };

  const openEdit = (item: PlannerItem) => {
    setDrawer({ open: true, type: item.kind, item });
  };

  const closeDrawer = () => {
    setDrawer((current) => ({ ...current, open: false, item: null }));
  };

  const changeFilter = (nextFilter: ItemFilter) => {
    setFilter(nextFilter);
    setActiveSection(nextFilter === "task" ? "tasks" : "planner");
  };

  const toggleTask = async (item: PlannerItem, completed: boolean) => {
    if (item.kind !== "task") return;
    try {
      await setTaskCompleted(user.uid, item.data.id, completed);
    } catch (error) {
      void message.error(
        firebaseErrorMessage(error, "Không thể cập nhật công việc."),
      );
    }
  };

  return (
    <div className="planner-shell">
      <DashboardSidebar
        activeSection={activeSection}
        counts={counts}
        pendingTasks={planner.pendingTasks}
        pinnedTools={pinnedTools.pinned}
        activeTool={activeTool}
        onNavigate={navigate}
        onOpenItem={openEdit}
        onOpenTool={openTool}
      />
      <MobileDashboardNavigation
        activeSection={activeSection}
        counts={counts}
        pendingTasks={planner.pendingTasks}
        pinnedTools={pinnedTools.pinned}
        activeTool={activeTool}
        open={mobileNavigationOpen}
        onClose={closeMobileNavigation}
        onNavigate={navigate}
        onOpenItem={openEdit}
        onOpenTool={openTool}
      />

      <main className="planner-main">
        <DashboardTopbar
          user={user}
          search={search}
          onSearchChange={setSearch}
          onAdd={() => openCreate(activeSection === "today" ? "task" : "event", activeSection === "today" ? dayjs() : selectedDate)}
          onOpenMobileNavigation={() => setMobileNavigationOpen(true)}
          onSignOut={() => void signOut()}
        />

        {planner.taskError || planner.eventError || planner.tagError ? (
          <Alert
            className="mb-4"
            type="error"
            showIcon
            title="Không thể đồng bộ planner"
            description={firebaseErrorMessage(planner.taskError ?? planner.eventError ?? planner.tagError, "Vui lòng thử lại.")}
          />
        ) : null}

        {activeSection === "notes" ? (
          <NotesPage
            userId={user.uid}
            items={checklist.items}
            loading={checklist.loading}
            error={checklist.error}
            search={search}
            onConvertItem={convertNoteItem}
          />
        ) : activeSection === "tools" ? (
          <ToolsPage
            activeTool={activeTool}
            pinned={pinnedTools.pinned}
            onOpenTool={openTool}
            onTogglePin={pinnedTools.togglePin}
          />
        ) : activeSection === "tags" ? (
          <TagManagerModal userId={user.uid} open embedded
            customTags={planner.customTags} onClose={() => navigate("planner")} />
        ) : activeSection === "today" ? (
          <TodayPanel items={planner.allItems} today={dayjs()} search={search} loading={planner.loading}
            onAdd={() => openCreate("task", dayjs())} onEdit={openEdit} onToggleTask={toggleTask} />
        ) : <>
        <section className="planner-overview" aria-label="Tổng quan kế hoạch">
          <div className="planner-overview-intro"><span className="planner-eyebrow">KHÔNG GIAN CỦA BẠN</span><h1>Ít bộn bề. <span>Thêm thảnh thơi.</span></h1></div>
          <div className="planner-stats">
            <button type="button" onClick={() => navigate("today")}><span className="stat-dot lavender" /><strong>{planner.counts.today.toString().padStart(2, "0")}</strong><span>Kế hoạch hôm nay</span></button>
            <button type="button" onClick={() => navigate("tasks")}><span className="stat-dot peach" /><strong>{planner.counts.tasks.toString().padStart(2, "0")}</strong><span>Việc đang chờ</span></button>
            <button className="planner-stat-completed" type="button" onClick={() => navigate("completed")}><span className="stat-dot mint" /><strong>{planner.counts.completed.toString().padStart(2, "0")}</strong><span>Đã hoàn thành</span></button>
          </div>
          <span className="overview-orbit" aria-hidden="true" />
        </section>
        <div className="planner-content-grid">
          <section className="planner-calendar-card">
            <CalendarToolbar
              visibleDate={visibleDate}
              view={view}
              filter={filter}
              // "Sắp tới" is a rolling 7-day window: paging months means nothing there.
              fixedPeriod={
                upcomingWindow
                  ? { label: "7 ngày tới", detail: `${dayjs().add(1, "day").format("DD/MM")} – ${dayjs().add(7, "day").format("DD/MM")}` }
                  : undefined
              }
              onChangeDate={setVisibleDate}
              onChangeView={setView}
              onChangeFilter={changeFilter}
              onToday={() => {
                goToToday();
              }}
            />

            {planner.loading ? (
              <div className="p-6">
                <Skeleton active paragraph={{ rows: 10 }} />
              </div>
            ) : (
              <PlannerCalendar
                items={planner.visibleItems}
                view={view}
                selectedDate={selectedDate}
                visibleDate={visibleDate}
                onSelectDate={selectDate}
                onVisibleDateChange={setVisibleDate}
                onEditItem={openEdit}
                onToggleTask={toggleTask}
                onAddItem={(date) => openCreate("event", date)}
                // Lists follow the month in the toolbar, except "Sắp tới",
                // whose section filter already limits it to the next 7 days.
                agendaScope={upcomingWindow ? "all" : "month"}
              />
            )}
          </section>

          <PlannerSidePanel
            selectedDate={selectedDate}
            selectedItems={planner.selectedItems}
            upcomingItems={planner.upcomingItems}
            nextReminder={planner.nextReminder}
            onAdd={openCreate}
            onImportClassSchedule={() => setClassScheduleOpen(true)}
            onEdit={openEdit}
            onToggleTask={toggleTask}
            onViewAgenda={() => navigate("upcoming")}
          />
        </div>
        </>}
      </main>
      <MobileBottomNavigation activeSection={activeSection} onNavigate={navigate} />
      <CountdownAlarm />

      <QuickAddDrawer
        userId={user.uid}
        open={drawer.open}
        initialDate={selectedDate}
        initialType={drawer.type}
        item={drawer.item}
        initialTitle={drawer.initialTitle}
        tags={planner.allTags}
        onClose={closeDrawer}
        onCreated={drawer.onCreated}
        onOpenTagManager={() => setTagManagerOpen(true)}
      />
      <ClassScheduleModal
        userId={user.uid}
        open={classScheduleOpen}
        initialDate={selectedDate}
        onClose={() => setClassScheduleOpen(false)}
      />
      <TagManagerModal
        userId={user.uid}
        open={tagManagerOpen}
        customTags={planner.customTags}
        onClose={() => setTagManagerOpen(false)}
      />
    </div>
  );
}
