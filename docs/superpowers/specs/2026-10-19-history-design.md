# Lịch sử thay đổi — Thiết kế

Ngày: 2026-10-19

## Mục tiêu

Thêm trang **Lịch sử** để xem lại mọi thay đổi trên sự kiện, nhiệm vụ, tag và dòng ghi chú trong **30 ngày** gần nhất, và **khôi phục mục đã xóa**.

Hiện app chưa lưu lịch sử. Xóa là xóa hẳn khỏi Firestore, tích một dòng ghi chú cũng xóa luôn dòng đó.

Ngoài phạm vi đợt này:

- Hoàn tác một lần sửa (quay về bản cũ). Chỉ khôi phục mục đã xóa.
- Ghi lại thay đổi không đi qua app (ví dụ sửa trực tiếp trên console Firebase).
- Đồng bộ lịch sử giữa nhiều người dùng. Lịch sử là dữ liệu riêng của từng tài khoản.

## Cách làm

Nhật ký được ghi **ngay trên client, trong cùng batch/transaction** với thao tác ghi dữ liệu. Thao tác thành công thì nhật ký có, thao tác lỗi thì cả hai đều không được lưu. Không cần Cloud Functions, vẫn chạy trên gói Spark.

Hai phương án khác đã cân nhắc và không chọn:

- **Cloud Functions `onWrite`**: cần gói Blaze, cần deploy functions, mà repo hiện chưa có functions nào.
- **Xóa mềm (`deletedAt`)**: chỉ giải quyết được chuyện xóa, và phải sửa mọi query lẫn rule.

## Dữ liệu

Collection `users/{userId}/history/{entryId}`. Id do Firestore tự sinh.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `action` | `create` \| `update` \| `delete` \| `complete` \| `reopen` \| `convert` \| `restore` | Loại thao tác |
| `entity` | `task` \| `event` \| `tag` \| `noteItem` | Loại mục |
| `entityId` | string (1..100) | Id của mục. Với tạo hàng loạt là id của mục đầu tiên |
| `title` | string (0..200) | Tên mục lúc thao tác, để hiển thị. `noteItem` dùng nội dung dòng |
| `before` | map \| null | Bản chụp trước thao tác |
| `after` | map \| null | Bản chụp sau thao tác |
| `count` | int ≥ 1 | Số mục bị ảnh hưởng. Bằng 1, trừ khi tạo hàng loạt |
| `at` | timestamp | `serverTimestamp()` |
| `expiresAt` | timestamp | `at` + 30 ngày, dùng cho TTL |

### Nội dung `before` / `after`

Bản chụp là **đúng dữ liệu đã ghi xuống Firestore**, không gồm `createdAt`/`updatedAt`:

- `task`: kết quả `taskPayload`.
- `event`: kết quả `eventPayload`.
- `tag`: `{ name, color }`.
- `noteItem`: `{ id, text, index }`.

| `action` | `before` | `after` |
|---|---|---|
| `create` | null | payload mới (với tạo hàng loạt là payload của mục đầu tiên) |
| `update` | payload cũ | payload mới |
| `complete` / `reopen` | null | payload sau khi đổi trạng thái (để hiện ngày của nhiệm vụ) |
| `delete` | payload cũ, dùng để khôi phục | null |
| `convert` | payload cũ (kiểu cũ) | payload mới (kiểu mới). `entity` là kiểu **mới** |
| `restore` | null | payload đã khôi phục |

Có `before` thì mới có thể khôi phục. Chỉ dòng `delete` mới có nút khôi phục, dòng `convert` thì không.

### Hết hạn sau 30 ngày

- Bật **Firestore TTL policy** cho collection group `history` trên trường `expiresAt`. Đây là thao tác làm một lần trên console hoặc bằng `gcloud firestore fields ttls update expiresAt --collection-group=history --enable-ttl`. Ghi vào README.
- TTL có thể dọn trễ tới khoảng 24 giờ. Vì vậy query luôn lọc `at >= now - 30 ngày`, để bản ghi đã hết hạn nhưng chưa bị dọn không hiện ra.
- `expiresAt` tính trên client bằng `Timestamp.fromMillis(Date.now() + 30 ngày)`. Rules không bắt nó phải bằng chính xác `request.time + 30d`, mà cho phép lệch ±1 ngày vì đồng hồ máy có thể sai.

## Ghi nhật ký

Module mới `src/lib/firebase/history.ts` có hàm `historyWrite(userId, entry)`. Hàm này trả về `{ ref, data }` (đã điền `at` và `expiresAt`) để caller `set` vào batch/transaction đang có. Task, event và tag dùng chung `saveLoggedSeries`/`deleteLogged` trong `src/lib/firebase/logged-writes.ts`.

| Hàm hiện có | Thay đổi |
|---|---|
| `createTask`, `createEvent`, `createTag` | Đổi `addDoc` sang batch: `set` mục mới + nhật ký `create` |
| `updateTask`, `updateEvent`, `updateTag` | Đổi sang transaction: đọc payload cũ, `update`, nhật ký `update` với `before`/`after`. Nếu payload không đổi gì thì không ghi nhật ký |
| `saveTaskSeries`, `saveEventSeries` | Mục đầu đã có thì ghi `update` như trên (cần đọc mục cũ nên chuyển sang transaction). Các mục mới được gom thành **một** dòng `create` với `count` = số mục mới. Có `replaces` (đổi kiểu) thì ghi một dòng `convert` thay cho `delete` + `create` |
| `setTaskCompleted` | Thêm nhật ký `complete` \| `reopen` vào transaction sẵn có, chỉ khi trạng thái thật sự đổi |
| `deleteTask`, `deleteEvent`, `deleteTag` | Đổi sang transaction: đọc mục, `delete`, nhật ký `delete` với `before`. Mục không còn tồn tại thì báo lỗi như `setTaskCompleted` |
| `addChecklistItems` | Ghi một dòng `create`, `count` = số dòng thêm được, `title` = dòng đầu |
| `updateChecklistItem` | Ghi `update` nếu nội dung đổi |
| `removeChecklistItem` | Ghi `delete` với `before = { id, text, index }` |
| `restoreChecklistItem` | Ghi `restore` (cả khi gọi từ nút Hoàn tác có sẵn trong trang Ghi chú) |

`updateChecklist` nhận thêm tham số tùy chọn để hàm `update` trả về entry nhật ký. Entry này được ghi trong cùng transaction.

Batch của Firestore giới hạn 500 thao tác. Nhờ gom tạo hàng loạt thành một dòng, mỗi lần lưu chỉ tốn thêm tối đa 1 thao tác.

## Khôi phục

`restoreFromHistory(userId, entry)` trong `src/lib/firebase/history.ts`:

- `task` / `event` / `tag`: `set` lại tài liệu **với đúng `entityId` cũ** từ `before`, kèm `createdAt` = `updatedAt` = `serverTimestamp()` (rules yêu cầu `createdAt == request.time`). Ghi nhật ký `restore` trong cùng transaction.
  - Giữ id cũ nên tag được khôi phục tự gắn lại với các mục đang trỏ tới `tagId` đó.
  - Mục được khôi phục có `createdAt` mới. Chấp nhận điều này.
- `noteItem`: gọi logic của `restoreChecklistItem` với `before.index`.
- Nếu id đã tồn tại thì không ghi gì. Transaction đọc trước, có rồi thì ném lỗi "Mục này đã được khôi phục."

Trên giao diện, nút **Khôi phục** chỉ hiện ở dòng `delete` khi `entityId` **không có** trong dữ liệu realtime đang tải (tasks, events, tags, checklist).

Giới hạn: dữ liệu realtime chỉ tải 200 mục mới nhất mỗi loại. Mục cũ hơn có thể bị hiểu nhầm là đã xóa, nên nút có thể hiện sai. Khi đó transaction sẽ chặn lại và báo lỗi, không tạo trùng.

## Firestore rules

Thêm `hasValidHistoryFields(data)` và:

```
match /users/{userId}/history/{entryId} {
  allow get: if isOwner(userId);
  allow list: if isOwner(userId)
    && request.query.limit != null
    && request.query.limit <= 100;
  allow create: if isOwner(userId)
    && hasValidHistoryFields(request.resource.data)
    && request.resource.data.at == request.time;
  allow update: if false;
  allow delete: if isOwner(userId);
}
```

`hasValidHistoryFields` kiểm tra:

- Đủ và chỉ có các khóa trong bảng trên.
- `action` và `entity` thuộc danh sách cho phép.
- `entityId` là string dài 1..100, `title` là string dài ≤ 200.
- `before`/`after` là `map` hoặc `null`.
- `count` là int ≥ 1.
- `expiresAt` là timestamp, và nằm trong khoảng `request.time + 29d` .. `request.time + 31d`.

Cập nhật khối chú thích "Data model" ở đầu file rules.

Không cần index mới: query chỉ `orderBy("at", "desc")` cộng điều kiện `at >=` trên cùng trường. Bộ lọc theo loại thực hiện trên client.

## Giao diện

### Điều hướng

- Thêm `"history"` vào `DashboardSection` và mục **Lịch sử** (icon `HistoryOutlined`) vào nhóm cuối của `navigationGroups`, sau "Quản lý tag".
- Bottom nav trên mobile giữ nguyên. Drawer dùng chung `DashboardNavigation` nên tự có mục này.

### Trang Lịch sử (`src/components/history/history-page.tsx`)

- **Thanh lọc**: `Segmented` chọn loại (Tất cả / Sự kiện / Nhiệm vụ / Tag / Ghi chú) và công tắc **"Chỉ mục đã xóa"**.
- **Danh sách nhóm theo ngày** theo giờ máy, với tiêu đề "Hôm nay", "Hôm qua", hoặc `dddd, DD/MM` cho ngày cũ hơn.
- **Mỗi dòng** có:
  - Icon theo `action`: tạo `PlusOutlined`, sửa `EditOutlined`, xóa `DeleteOutlined`, hoàn thành `CheckOutlined`, mở lại `UndoOutlined`, đổi kiểu `SwapOutlined`, khôi phục `RollbackOutlined`.
  - Câu mô tả, ví dụ:
    - *Đã xóa nhiệm vụ "Nộp báo cáo"*
    - *Đã tạo 24 sự kiện "Toán cao cấp"*
    - *Đã tích dòng ghi chú "Mua sữa"*
    - *Đã đổi sự kiện "Họp nhóm" thành nhiệm vụ*
  - **Ngày của mục trên lịch** (`entryDateLabel`), dạng nhãn nhỏ sau câu mô tả:
    - Một ngày: `20/10`. Năm khác năm hiện tại thì thêm năm: `05/01/2027`.
    - Sửa có dời ngày: `12/10 → 14/10`. Đổi kiểu thì so `startAt` với `deadline`.
    - Tạo hàng loạt: `từ 20/10` (ngày của mục đầu tiên).
    - Không hiện với tag, dòng ghi chú, nhiệm vụ không có ngày, và các bản ghi cũ không có bản chụp.
  - Giờ `HH:mm`.
  - Nút **Khôi phục** (theo điều kiện ở trên).
- **Bấm vào dòng `update`/`convert`** để mở danh sách thay đổi, mỗi trường một dòng `Nhãn: cũ → mới`. Các dòng khác không mở rộng được.
- **Tải thêm**: mỗi trang 50 dòng (`limit(50)`, `startAfter`). Hết dữ liệu thì ẩn nút.
- **Trống**: dùng `EmptyState` sẵn có, nội dung "Chưa có thay đổi nào trong 30 ngày qua."
- **Xóa nhật ký**: nút trong menu `…` ở đầu trang, mở hộp xác nhận (`modal.confirm`). Xóa theo lô 100 bản ghi tới khi hết.
- Khôi phục thành công thì `message.success("Đã khôi phục …")`. Thất bại thì hiện `firebaseErrorMessage`.

Danh sách không dùng realtime listener. Trang tải bằng `getDocs` khi mở, và tải lại sau mỗi lần khôi phục hoặc khi người dùng bấm làm mới. Như vậy tránh được một listener chạy thường trực.

### Nhãn trường khi so sánh

| Trường | Nhãn | Định dạng |
|---|---|---|
| `title` | Tiêu đề | chuỗi |
| `description` | Ghi chú | chuỗi, cắt 80 ký tự |
| `location` | Địa điểm | chuỗi |
| `deadline` / `startAt` | Bắt đầu | `DD/MM/YYYY` |
| `endAt` | Kết thúc | `DD/MM/YYYY`, null → "Không có" |
| `status` | Trạng thái | todo → "Chưa xong", in_progress → "Đang làm", done → "Đã xong" |
| `priority` | Ưu tiên | Thấp / Trung bình / Cao |
| `tagName` | Tag | rỗng → "Không có" |
| `tagColor` / `color` | Màu | ô màu nhỏ |
| `reminderMinutes` | Nhắc nhở | nhãn từ `reminderOptions` |
| `name` (tag) | Tên tag | chuỗi |
| `text` (ghi chú) | Nội dung | chuỗi |

`tagId` không hiển thị vì đã có `tagName`. Trường không có trong bảng thì bỏ qua.

## Cấu trúc code

| File | Vai trò |
|---|---|
| `src/lib/history.ts` | Logic thuần, không phụ thuộc Firebase: kiểu `HistoryEntry`, `diffFields(before, after)`, `describeEntry(entry)`, `groupByDay(entries, today)`, `historyCutoff(now)` |
| `src/lib/firebase/history.ts` | `historyWrite`, `toSnapshot`, `payloadChanged`, `fetchHistoryPage`, `clearHistory` |
| `src/lib/firebase/logged-writes.ts` | `saveLoggedSeries`, `deleteLogged`: ghi task/event/tag kèm nhật ký |
| `src/lib/firebase/restore.ts` | `restoreFromHistory` (tách riêng để tránh import vòng) |
| `src/lib/firebase/{tasks,events,tags,notes}.ts` | Ghi nhật ký như bảng ở mục "Ghi nhật ký" |
| `src/hooks/use-history.ts` | Phân trang, lọc, trạng thái tải/lỗi, khôi phục |
| `src/components/history/history-page.tsx` | Trang Lịch sử |
| `src/components/history/history-entry-row.tsx` | Một dòng, kèm phần so sánh mở rộng |
| `src/components/dashboard/*` | Thêm mục điều hướng và render trang |

Firestore `Timestamp` trong `before`/`after` được đổi sang `Date` khi đọc. `diffFields` so sánh `Date` theo giá trị.

## Kiểm thử

- **`tests/history.test.ts`** (Vitest):
  - `diffFields`: bỏ qua trường không đổi, so sánh ngày theo giá trị, format nhãn đúng.
  - `describeEntry`: đủ mọi `action` × `entity`, có `count` > 1.
  - `groupByDay`: Hôm nay / Hôm qua / ngày cũ hơn, và mốc nửa đêm.
  - `historyCutoff`: mốc 30 ngày.
- **`tests/firestore.rules.test.ts`** thêm các ca:
  - Chủ sở hữu tạo được bản ghi hợp lệ, người khác thì không.
  - Bị từ chối khi: `at` khác `request.time`, `expiresAt` ngoài khoảng cho phép, sai `action`/`entity`, có khóa thừa.
  - `update` luôn bị từ chối, `delete` được phép với chủ sở hữu.
  - `list` có `limit` > 100 bị từ chối.
  - Batch `delete` task + `create` history thành công.
- **Kiểm tra tay** trên app chạy với emulator:
  - Tạo, sửa, hoàn thành, xóa một nhiệm vụ rồi khôi phục.
  - Xóa một tag rồi khôi phục, kiểm tra mục cũ hiện lại màu tag.
  - Tích một dòng ghi chú rồi khôi phục từ trang Lịch sử.
  - Thêm lịch học, kiểm tra chỉ có một dòng "Đã tạo N sự kiện".
