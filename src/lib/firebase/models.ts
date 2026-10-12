export const taskPriorities = ["low", "medium", "high"] as const;
export const taskStatuses = ["todo", "in_progress", "done"] as const;

export type TaskPriority = (typeof taskPriorities)[number];
export type TaskStatus = (typeof taskStatuses)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: Date | null;
  endAt: Date | null;
  priority: TaskPriority;
  status: TaskStatus;
  tagId: string | null;
  tagName: string;
  tagColor: string;
  reminderMinutes: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface TaskInput {
  title: string;
  description?: string;
  deadline?: Date | null;
  endAt?: Date | null;
  completed?: boolean;
  priority?: TaskPriority;
  status?: TaskStatus;
  tagId?: string | null;
  tagName?: string;
  tagColor?: string;
  reminderMinutes?: number | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startAt: Date;
  endAt: Date | null;
  tagId: string | null;
  tagName: string;
  tagColor: string;
  reminderMinutes: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface EventInput {
  title: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt?: Date | null;
  tagId?: string | null;
  tagName?: string;
  tagColor?: string;
  reminderMinutes?: number | null;
}

export interface PlannerTag {
  id: string;
  name: string;
  color: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PlannerTagInput {
  name: string;
}

/** A checklist line. Ticking one off deletes it, so there is no "done" flag. */
export interface NoteItem {
  id: string;
  text: string;
}
