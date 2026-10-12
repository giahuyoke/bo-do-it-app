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
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { createTask, setTaskCompleted, updateTask } from "@/lib/firebase/tasks";
import { createEvent, updateEvent } from "@/lib/firebase/events";
import { createTag, updateTag, deleteTag } from "@/lib/firebase/tags";

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
});
