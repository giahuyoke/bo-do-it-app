import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  collection,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { createTask, deleteTask, saveTaskSeries, setTaskCompleted, updateTask } from "@/lib/firebase/tasks";
import { createEvent, deleteEvent, eventRef, saveEventSeries, updateEvent } from "@/lib/firebase/events";
import { createTag, updateTag, deleteTag } from "@/lib/firebase/tags";
import {
  addChecklistItems,
  newNoteItem,
  removeChecklistItem,
  restoreChecklistItem,
  updateChecklistItem,
} from "@/lib/firebase/notes";

let testEnvironment: RulesTestEnvironment;
let sdkDb: Firestore;
vi.mock("@/lib/firebase/client", () => ({ getFirestoreDb: () => sdkDb }));

const validTask = () => ({
  title: "Hoàn thành báo cáo",
  description: "Chuẩn bị số liệu tháng",
  deadline: Timestamp.fromDate(new Date("2026-10-20T08:00:00Z")),
  endAt: Timestamp.fromDate(new Date("2026-10-20T09:00:00Z")),
  priority: "high",
  status: "todo",
  tagId: "default-deadline",
  tagName: "Deadline",
  tagColor: "#f6c76f",
  reminderMinutes: 30,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const validEvent = () => ({
  title: "Họp nhóm",
  description: "Tổng kết sprint",
  location: "Phòng họp A",
  startAt: Timestamp.fromDate(new Date("2026-10-20T08:00:00Z")),
  endAt: Timestamp.fromDate(new Date("2026-10-20T09:00:00Z")),
  tagId: null,
  tagName: "",
  tagColor: "",
  reminderMinutes: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const validTag = () => ({
  name: "Thi cử",
  color: "#f6d776",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const validHistory = () => ({
  action: "delete",
  entity: "task",
  entityId: "task-1",
  title: "Nộp báo cáo",
  before: { title: "Nộp báo cáo" },
  after: null,
  count: 1,
  at: serverTimestamp(),
  expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
});
async function historyDocs() {
  const snapshot = await getDocs(
    query(collection(sdkDb, "users/alice/history"), orderBy("at", "asc"), limit(100)),
  );
  return snapshot.docs.map((item) => item.data());
}

const actionsOf = (entries: Array<Record<string, unknown>>) => entries.map((entry) => String(entry.action)).sort();

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: "demo-bo-do-it",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  sdkDb = testEnvironment.authenticatedContext("alice").firestore() as unknown as Firestore;
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("Firestore ownership rules", () => {
  test("payload từ SDK thực tế lưu và cập nhật task, event, tag", async () => {
    const tag = await createTag("alice", { name: "  Cá nhân  " });
    await updateTag("alice", tag.id, { name: "Sáng tạo" });
    const shared = { title: "Kế hoạch kiểm thử", tagId: tag.id, tagName: "Sáng tạo", tagColor: "#78c6a3", reminderMinutes: 15 };
    const task = await createTask("alice", shared);
    await setTaskCompleted("alice", task.id, true);
    expect((await getDoc(task)).data()?.status).toBe("done");
    await updateTask("alice", task.id, { ...shared, completed: false });
    const event = await createEvent("alice", { ...shared, startAt: new Date("2026-10-20T08:00:00Z"), endAt: null });
    await updateEvent("alice", event.id, { ...shared, startAt: new Date("2026-10-21T08:00:00Z") });
    expect((await getDoc(event)).data()?.endAt).toBeNull();
    await deleteTag("alice", tag.id);
  });

  test("đánh dấu hoàn thành task cũ bổ sung các trường mới mà không mất dữ liệu", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/alice/tasks/legacy"), {
        title: "Công việc cũ", description: "Giữ ghi chú", priority: "high", status: "todo", deadline: null,
        createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")), updatedAt: Timestamp.now(),
      });
    });
    await setTaskCompleted("alice", "legacy", true);
    const task = (await getDoc(doc(sdkDb, "users/alice/tasks/legacy"))).data();
    expect(task).toMatchObject({ title: "Công việc cũ", description: "Giữ ghi chú", priority: "high", status: "done", tagId: null, reminderMinutes: null, endAt: null });
    expect(task?.createdAt.toDate().toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  test("query event và tag, sửa/xóa tag vẫn giữ quyền theo tài khoản", async () => {
    const tag = await createTag("alice", { name: "Tag riêng" });
    const bob = testEnvironment.authenticatedContext("bob").firestore();
    await assertSucceeds(getDocs(query(collection(sdkDb, "users/alice/tags"), limit(100))));
    await assertFails(getDocs(query(collection(sdkDb, "users/alice/tags"), limit(101))));
    await assertSucceeds(getDocs(query(collection(sdkDb, "users/alice/events"), limit(200))));
    await assertFails(updateDoc(doc(bob, "users/alice/tags", tag.id), { name: "Bị sửa", updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(bob, "users/alice/tags", tag.id)));
    await assertFails(getDocs(query(collection(bob, "users/alice/events"), limit(200))));
  });

  test("người dùng được CRUD task của chính mình", async () => {
    const db = testEnvironment.authenticatedContext("alice").firestore();
    const taskRef = doc(db, "users/alice/tasks/task-1");

    await assertSucceeds(setDoc(taskRef, validTask()));
    await assertSucceeds(getDoc(taskRef));
    await assertSucceeds(
      updateDoc(taskRef, {
        status: "done",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(deleteDoc(taskRef));
  });

  test("người dùng khác không thể đọc hoặc ghi task", async () => {
    const aliceDb = testEnvironment.authenticatedContext("alice").firestore();
    const bobDb = testEnvironment.authenticatedContext("bob").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, "users/alice/tasks/task-1"), validTask()),
    );
    await assertFails(getDoc(doc(bobDb, "users/alice/tasks/task-1")));
    await assertFails(
      setDoc(doc(bobDb, "users/alice/tasks/task-2"), validTask()),
    );
  });

  test("list query phải có giới hạn tối đa 200 bản ghi", async () => {
    const db = testEnvironment.authenticatedContext("alice").firestore();
    const tasks = collection(db, "users/alice/tasks");

    await assertSucceeds(getDocs(query(tasks, limit(200))));
    await assertFails(getDocs(query(tasks, limit(201))));
    await assertFails(getDocs(query(tasks)));
  });

  test("khách chưa đăng nhập không thể truy cập dữ liệu", async () => {
    const db = testEnvironment.unauthenticatedContext().firestore();
    const taskRef = doc(db, "users/alice/tasks/task-1");

    await assertFails(getDoc(taskRef));
    await assertFails(setDoc(taskRef, validTask()));
  });

  test("không cho phép thay đổi createdAt", async () => {
    const db = testEnvironment.authenticatedContext("alice").firestore();
    const taskRef = doc(db, "users/alice/tasks/task-1");

    await assertSucceeds(setDoc(taskRef, validTask()));
    await assertFails(
      updateDoc(taskRef, {
        createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("event hợp lệ được ghi và event có thời gian ngược bị từ chối", async () => {
    const db = testEnvironment.authenticatedContext("alice").firestore();

    await assertSucceeds(
      setDoc(doc(db, "users/alice/events/event-1"), validEvent()),
    );
    await assertSucceeds(
      setDoc(doc(db, "users/alice/events/event-without-end"), {
        ...validEvent(),
        endAt: null,
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice/events/event-2"), {
        ...validEvent(),
        startAt: Timestamp.fromDate(new Date("2026-10-20T10:00:00Z")),
        endAt: Timestamp.fromDate(new Date("2026-10-20T09:00:00Z")),
      }),
    );
  });

  test("tag chỉ được quản lý trong phạm vi của chủ sở hữu", async () => {
    const aliceDb = testEnvironment.authenticatedContext("alice").firestore();
    const bobDb = testEnvironment.authenticatedContext("bob").firestore();
    const tagRef = doc(aliceDb, "users/alice/tags/tag-1");

    await assertSucceeds(setDoc(tagRef, validTag()));
    await assertSucceeds(getDoc(tagRef));
    await assertFails(getDoc(doc(bobDb, "users/alice/tags/tag-1")));
  });

  test("từ chối màu tag và reminder ngoài danh sách cho phép", async () => {
    const db = testEnvironment.authenticatedContext("alice").firestore();

    await assertFails(
      setDoc(doc(db, "users/alice/tags/tag-1"), {
        ...validTag(),
        color: "red",
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice/tasks/task-1"), {
        ...validTask(),
        reminderMinutes: 999,
      }),
    );
  });

  test("checklist: SDK payloads add, edit, tick off and undo lines", async () => {
    const main = doc(sdkDb, "users/alice/notes/main");
    const milk = newNoteItem("Sữa tươi");
    // The first add creates the document; blank lines are dropped.
    expect(await addChecklistItems("alice", [milk, newNoteItem("Trứng"), newNoteItem("   ")])).toBe(2);
    expect((await getDoc(main)).data()).toMatchObject({ title: "", color: "", pinned: false });

    await updateChecklistItem("alice", milk.id, "Sữa không đường");
    const removed = await removeChecklistItem("alice", milk.id);
    expect(removed).toEqual({ item: { id: milk.id, text: "Sữa không đường" }, index: 0 });
    expect((await getDoc(main)).data()?.items.map((item: { text: string }) => item.text)).toEqual(["Trứng"]);

    await restoreChecklistItem("alice", removed!.item, removed!.index);
    expect((await getDoc(main)).data()?.items[0]).toEqual(removed!.item);
  });

  test("checklist: rejects foreign owners, extra fields and oversized lists", async () => {
    await addChecklistItems("alice", [newNoteItem("Riêng tư")]);
    const bob = testEnvironment.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bob, "users/alice/notes/main")));
    await assertFails(updateDoc(doc(bob, "users/alice/notes/main"), { items: [], updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(sdkDb, "users/alice/notes/main"), { extra: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(sdkDb, "users/alice/notes/main"), {
      items: Array.from({ length: 101 }, (_, index) => ({ id: String(index), text: "x" })),
      updatedAt: serverTimestamp(),
    }));
  });
});

describe("History log rules", () => {
  test("chủ sở hữu tạo, đọc và xóa được bản ghi hợp lệ; người khác thì không", async () => {
    const entry = doc(sdkDb, "users/alice/history/h1");
    const bob = testEnvironment.authenticatedContext("bob").firestore();
    await assertSucceeds(setDoc(entry, validHistory()));
    await assertSucceeds(getDoc(entry));
    await assertFails(getDoc(doc(bob, "users/alice/history/h1")));
    await assertFails(setDoc(doc(bob, "users/alice/history/h2"), validHistory()));
    await assertSucceeds(deleteDoc(entry));
  });

  test("bản ghi không sửa được", async () => {
    const entry = doc(sdkDb, "users/alice/history/h1");
    await assertSucceeds(setDoc(entry, validHistory()));
    await assertFails(updateDoc(entry, { title: "Đổi" }));
  });

  test("từ chối at sai, expiresAt ngoài khoảng, enum sai, khóa thừa, count < 1", async () => {
    const entry = doc(sdkDb, "users/alice/history/h1");
    await assertFails(setDoc(entry, { ...validHistory(), at: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")) }));
    await assertFails(setDoc(entry, { ...validHistory(), expiresAt: Timestamp.fromMillis(Date.now() + 60 * 86_400_000) }));
    await assertFails(setDoc(entry, { ...validHistory(), expiresAt: Timestamp.now() }));
    await assertFails(setDoc(entry, { ...validHistory(), action: "archive" }));
    await assertFails(setDoc(entry, { ...validHistory(), entity: "note" }));
    await assertFails(setDoc(entry, { ...validHistory(), extra: true }));
    await assertFails(setDoc(entry, { ...validHistory(), count: 0 }));
    await assertFails(setDoc(entry, { ...validHistory(), title: "x".repeat(201) }));
    await assertFails(setDoc(entry, { ...validHistory(), before: "text" }));
  });

  test("list phải có limit ≤ 100", async () => {
    const history = collection(sdkDb, "users/alice/history");
    await assertSucceeds(getDocs(query(history, orderBy("at", "desc"), limit(100))));
    await assertFails(getDocs(query(history, limit(101))));
    await assertFails(getDocs(query(history)));
  });
});

describe("History log writes", () => {
  test("task: tạo, sửa, sửa không đổi, hoàn thành, xóa", async () => {
    const input = { title: "Nộp báo cáo", deadline: new Date("2026-10-20T00:00:00Z") };
    const task = await createTask("alice", input);
    await updateTask("alice", task.id, { ...input, title: "Nộp báo cáo quý" });
    await updateTask("alice", task.id, { ...input, title: "Nộp báo cáo quý" });
    await setTaskCompleted("alice", task.id, true);
    await setTaskCompleted("alice", task.id, true);
    await deleteTask("alice", task.id);

    const entries = await historyDocs();
    expect(actionsOf(entries)).toEqual(["complete", "create", "delete", "update"]);
    const update = entries.find((entry) => entry.action === "update")!;
    expect(update.before.title).toBe("Nộp báo cáo");
    expect(update.after.title).toBe("Nộp báo cáo quý");
    const deleted = entries.find((entry) => entry.action === "delete")!;
    expect(deleted).toMatchObject({ entity: "task", entityId: task.id, title: "Nộp báo cáo quý", after: null, count: 1 });
    expect(deleted.before).toMatchObject({ title: "Nộp báo cáo quý", status: "done" });
  });

  test("task: tạo nhiều khoảng ngày chỉ ghi một dòng có count", async () => {
    const day = (date: string) => ({ title: "Ôn thi", deadline: new Date(date) });
    await saveTaskSeries("alice", null, [day("2026-10-20T00:00:00Z"), day("2026-10-21T00:00:00Z"), day("2026-10-22T00:00:00Z")]);
    const entries = await historyDocs();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ action: "create", entity: "task", title: "Ôn thi", count: 3 });
  });

  test("xóa task không còn tồn tại thì báo lỗi và không ghi nhật ký", async () => {
    await expect(deleteTask("alice", "missing")).rejects.toThrow("Công việc này không còn tồn tại.");
    expect(await historyDocs()).toHaveLength(0);
  });

  test("event: tạo, sửa, xóa", async () => {
    const input = { title: "Họp nhóm", location: "Phòng A", startAt: new Date("2026-10-20T08:00:00Z") };
    const event = await createEvent("alice", input);
    await updateEvent("alice", event.id, { ...input, location: "Phòng B" });
    await deleteEvent("alice", event.id);
    const entries = await historyDocs();
    expect(actionsOf(entries)).toEqual(["create", "delete", "update"]);
    expect(entries.find((entry) => entry.action === "delete")!.before).toMatchObject({ location: "Phòng B" });
  });

  test("đổi sự kiện thành nhiệm vụ ghi một dòng convert", async () => {
    const event = await createEvent("alice", { title: "Họp nhóm", location: "Phòng A", startAt: new Date("2026-10-20T08:00:00Z") });
    await saveTaskSeries("alice", null, [{ title: "Họp nhóm", deadline: new Date("2026-10-20T00:00:00Z") }], eventRef("alice", event.id));
    const entries = await historyDocs();
    expect(actionsOf(entries)).toEqual(["convert", "create"]);
    const convert = entries.find((entry) => entry.action === "convert")!;
    expect(convert).toMatchObject({ entity: "task", title: "Họp nhóm", count: 1 });
    expect(convert.before).toMatchObject({ location: "Phòng A" });
    expect((await getDoc(eventRef("alice", event.id))).exists()).toBe(false);
  });

  test("lịch học nhiều buổi chỉ ghi một dòng", async () => {
    const sessions = Array.from({ length: 24 }, (_, index) => ({
      title: "Toán cao cấp",
      startAt: new Date(Date.UTC(2026, 9, 20 + index, 1)),
    }));
    await saveEventSeries("alice", null, sessions);
    const entries = await historyDocs();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ action: "create", entity: "event", count: 24 });
  });
});
