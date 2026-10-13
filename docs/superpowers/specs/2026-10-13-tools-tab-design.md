# Tab "Công cụ" — Thiết kế

Ngày: 2026-10-13

## Mục tiêu

Thêm mục **Công cụ** vào sidebar của Bo-Do-It, gom các tiện ích nhỏ dùng hằng ngày. Đợt này làm 5 công cụ:

1. Bấm giờ / Đếm ngược
2. Tính ngày
3. Bốc thăm / Chia nhóm
4. Đếm chữ
5. Xử lý dòng

Wheel, Máy tính, Text Transform và Text Diff sẽ thêm vào sau, bằng cách thêm entry vào registry.

## Điều hướng

### Sidebar

- Thêm `"tools"` vào `DashboardSection` và mục **Công cụ** (icon `ToolOutlined`) trong `navigationGroups`.
- Bấm "Công cụ" thì mở **trang danh sách công cụ** (`activeTool = null`).
- Công cụ đã ghim hiện thành **submenu** dưới "Công cụ", theo đúng pattern mục mở rộng của "Nhiệm vụ" (`planner-nav-expandable` cùng nút toggle ▾):
  - Mỗi mục có icon và tên. Bấm vào sẽ mở thẳng công cụ đó (`activeSection = "tools"`, `activeTool = key`).
  - Mục đang mở được tô sáng (`is-active`, `aria-current="page"`). Khi một công cụ con đang active thì mục cha "Công cụ" không tô sáng.
  - Thứ tự submenu theo thứ tự ghim: ghim trước đứng trên.
  - Không có công cụ nào được ghim thì không hiện submenu và nút toggle.
  - Submenu mặc định mở. Trạng thái thu gọn chỉ giữ trong phiên, không lưu.
- Drawer trên mobile dùng chung `DashboardNavigation` nên cũng có submenu. Thanh điều hướng dưới đáy (bottom nav) giữ nguyên.

### Trang danh sách công cụ

- Lưới card: ≥1024px 3 cột, ≥640px 2 cột, nhỏ hơn thì 1 cột.
- Mỗi card có icon, tên, mô tả tiếng Việt (1–2 dòng) và **nút ghim** ở góc phải trên.
  - Nút ghim là `<button>` riêng, có `aria-pressed` và `aria-label` "Ghim công cụ" / "Bỏ ghim công cụ". Bấm nút ghim không mở công cụ (dùng `stopPropagation`, hoặc tách nút ra khỏi vùng bấm của card).
  - Đã ghim thì icon `PushpinFilled` có màu nhấn. Chưa ghim thì `PushpinOutlined`.
- Bấm vào phần còn lại của card thì mở công cụ.

### Trang công cụ

- Header: nút "← Công cụ" để quay về danh sách, tên công cụ, mô tả ngắn, và nút ghim/bỏ ghim.
- Nội dung là component của công cụ đó.

### Mô tả các công cụ

| key | Tên | Mô tả |
|---|---|---|
| `timer` | Bấm giờ / Đếm ngược | Bấm giờ nhanh hoặc đếm ngược tới một mốc thời gian, có báo khi hết giờ. |
| `date-calc` | Tính ngày | Cộng/trừ ngày, đếm số ngày và số ngày làm việc giữa hai mốc. |
| `random-picker` | Bốc thăm / Chia nhóm | Dán danh sách tên, bốc ngẫu nhiên vài người hoặc chia đều thành nhóm. |
| `word-counter` | Đếm chữ | Đếm ký tự, từ, dòng, câu và ước tính thời gian đọc. |
| `line-tools` | Xử lý dòng | Sắp xếp, bỏ trùng, xáo trộn, thêm tiền tố/hậu tố cho từng dòng. |

## Kiến trúc

```
src/lib/tools/
  registry.ts        # ToolKey, danh sách tool (key, name, description, icon)
  pins.ts            # đọc/ghi danh sách ghim (localStorage) — hàm thuần + parse an toàn
  timer.ts           # tính thời gian đã chạy / còn lại từ timestamp, format hh:mm:ss
  date-calc.ts       # addDuration, diffDays, countWorkingDays
  random-picker.ts   # shuffle (Fisher–Yates), pickK, splitIntoGroups
  word-counter.ts    # countText → { chars, charsNoSpaces, words, lines, sentences, paragraphs, readingMinutes }
  line-tools.ts      # các thao tác dòng
src/hooks/
  use-pinned-tools.ts  # state ghim + đồng bộ localStorage (kể cả giữa các tab qua sự kiện "storage")
src/components/tools/
  tools-page.tsx       # danh sách hoặc công cụ đang mở
  tool-card.tsx
  timer-tool.tsx
  date-calc-tool.tsx
  random-picker-tool.tsx
  word-counter-tool.tsx
  line-tools-tool.tsx
```

- `activeTool: ToolKey | null` là state nằm trong `dashboard.tsx`, cạnh `activeSection`. Sidebar nhận `pinnedTools`, `activeTool` và callback `onOpenTool(key)`.
- `usePinnedTools` được gọi ở `dashboard.tsx` rồi truyền xuống sidebar và `ToolsPage`, để cả hai luôn thấy cùng một danh sách ghim.
- Toàn bộ chạy ở client, không có Firestore.

### Lưu trữ (localStorage)

| Key | Giá trị |
|---|---|
| `bo-do-it:pinned-tools` | `ToolKey[]` (JSON). Khi parse sẽ lọc bỏ key không có trong registry và key trùng. JSON lỗi thì coi như `[]`. |
| `bo-do-it:timer` | Trạng thái bấm giờ / đếm ngược (xem bên dưới). |

Mọi lần đọc/ghi đều bọc `try/catch` để chế độ ẩn danh hoặc storage bị chặn không làm crash app. Khi SSR thì dùng giá trị mặc định, sau khi mount mới đọc storage.

## Chi tiết từng công cụ

### 1. Bấm giờ / Đếm ngược (`timer`)

Có 2 tab: **Bấm giờ** và **Đếm ngược**.

- **Bấm giờ:** các nút Bắt đầu / Tạm dừng / Tiếp tục, Vòng (lap), Đặt lại. Hiển thị `mm:ss.cs` (có thêm `h:` khi chạy quá 1 giờ). Danh sách lap ghi thời gian của từng vòng và tổng thời gian.
- **Đếm ngược**, có 2 cách đặt:
  - *Khoảng thời gian:* preset 5 / 10 / 15 / 25 phút, hoặc tự nhập giờ, phút, giây.
  - *Đến mốc:* chọn ngày giờ (DatePicker có chọn giờ). Mốc đã qua thì báo lỗi và không cho bắt đầu.
  - Các nút Bắt đầu / Tạm dừng / Tiếp tục, Đặt lại. Có thanh tiến độ.
  - Khi về 0: phát tiếng bíp bằng Web Audio API (không cần file âm thanh), hiện `notification` của antd và đổi tiêu đề tab thành "⏰ Hết giờ!". Nếu người dùng đã cấp quyền Notification thì gửi thêm thông báo của trình duyệt. Quyền chỉ được xin khi người dùng bấm Bắt đầu lần đầu.
- **State lưu bằng timestamp**, không cộng dồn theo từng tick:
  - Bấm giờ: `{ startedAt: number | null, elapsedBeforeStart: number, laps: number[] }`
  - Đếm ngược: `{ endsAt: number | null, remainingWhenPaused: number | null, totalMs: number }`
  - Tick dùng `requestAnimationFrame` khi trang đang hiển thị. Nhờ lưu timestamp nên chuyển section, chuyển công cụ hay reload trang thì giờ vẫn đúng. Nếu reload sau khi đã quá giờ thì hiện trạng thái "Hết giờ" nhưng không bíp lại.

### 2. Tính ngày (`date-calc`)

Có 2 tab:

- **Cộng / trừ:** ngày gốc (mặc định hôm nay) ± N ngày / tuần / tháng / năm. Có tùy chọn "Chỉ tính ngày làm việc" (chỉ áp dụng khi đơn vị là ngày). Kết quả hiển thị kiểu "Thứ Sáu, 23/10/2026".
- **Khoảng cách:** chọn từ ngày → đến ngày. Kết quả gồm:
  - Tổng số ngày (có tùy chọn "Tính cả ngày cuối").
  - Quy đổi ra "x tuần y ngày" và "x tháng y ngày".
  - Số ngày làm việc (T2–T6), có tùy chọn "Tính thứ 7 là ngày làm việc".
  - Nếu đến ngày nằm trước từ ngày thì vẫn tính và hiện dấu âm hoặc ghi chú "(ngược chiều)".
- Không trừ ngày lễ, để làm sau.

### 3. Bốc thăm / Chia nhóm (`random-picker`)

- Input là textarea, mỗi dòng một tên. Dòng trống bị bỏ qua và khoảng trắng hai đầu được cắt.
- Có 2 chế độ:
  - **Bốc thăm:** bốc K người (1 ≤ K ≤ số tên). Kết quả hiện theo thứ tự đã bốc.
  - **Chia nhóm:** chia thành N nhóm, hoặc mỗi nhóm N người. Chia đều: các nhóm hơn kém nhau tối đa 1 người.
- Có nút "Bốc lại" / "Chia lại" và "Copy kết quả" (dạng văn bản, mỗi nhóm một khối "Nhóm 1: …").
- Ngẫu nhiên dùng `crypto.getRandomValues` theo Fisher–Yates. Hàm thuần nhận `random` làm tham số để test được.
- Báo lỗi ngay trong form khi danh sách rỗng hoặc K / N không hợp lệ.

### 4. Đếm chữ (`word-counter`)

- Một textarea, các con số cập nhật ngay khi gõ: ký tự, ký tự không tính khoảng trắng, từ, dòng, câu, đoạn, thời gian đọc.
- Từ là các chuỗi tách theo khoảng trắng và có ít nhất một chữ cái hoặc chữ số (Unicode, đếm đúng tiếng Việt có dấu). Mỗi âm tiết tiếng Việt tính là một từ.
- Câu tách theo `.`, `!`, `?` hoặc `…`, đi kèm khoảng trắng hoặc ở cuối văn bản.
- Đoạn là các khối ngăn cách bởi ít nhất một dòng trống.
- Ký tự đếm theo grapheme (`Intl.Segmenter`, có fallback) để emoji và ký tự tổ hợp không bị đếm thành nhiều.
- Thời gian đọc tính 200 từ/phút, hiển thị "< 1 phút" hoặc "~N phút".

### 5. Xử lý dòng (`line-tools`)

- Bố cục INPUT → THAO TÁC → OUTPUT, theo màn Text Transform trong ảnh tham khảo. Trên mobile xếp dọc.
- Các thao tác:
  - Sắp xếp A→Z / Z→A (`localeCompare` với locale `vi`, `sensitivity: "base"`, `numeric: true`)
  - Bỏ dòng trùng (giữ lần xuất hiện đầu, có tùy chọn không phân biệt hoa thường)
  - Đảo thứ tự
  - Xáo trộn
  - Bỏ dòng trống
  - Cắt khoảng trắng đầu/cuối
  - Thêm tiền tố / hậu tố (2 ô nhập. Có tùy chọn đánh số: `{n}` trong tiền tố được thay bằng số thứ tự dòng)
- Mỗi thao tác áp lên output hiện tại, nên có thể nối nhiều bước. Có nút "Dùng output làm input", "Copy" và "Đặt lại".
- Dòng thống kê nhỏ: "12 dòng → 9 dòng".

## Giao diện

- Dùng antd và Tailwind cùng các token màu hiện có, hỗ trợ cả theme sáng và tối.
- Toàn bộ chữ hiển thị bằng tiếng Việt.
- Copy dùng `navigator.clipboard`, xong thì hiện `message.success("Đã copy")`.
- Trên mobile không có cuộn ngang. Các cột xếp dọc dưới 768px.

## Xử lý lỗi

- localStorage hỏng hoặc bị chặn thì dùng giá trị mặc định, không crash.
- Input không hợp lệ thì báo lỗi ngay trong form và khóa nút hành động. Không dùng `alert`.
- Clipboard bị từ chối thì báo `message.error("Không copy được")`.
- Web Audio hoặc Notification không có hay bị từ chối thì bỏ qua, chỉ dựa vào thông báo trong app.

## Test (`tests/tools.test.ts`, vitest)

- `pins`: parse JSON lỗi, lọc key lạ và key trùng, toggle ghim giữ đúng thứ tự.
- `timer`: elapsed / remaining tính từ timestamp, khi tạm dừng rồi tiếp tục, khi đã quá giờ, và format thời gian.
- `date-calc`: đếm ngày làm việc qua cuối tuần, có và không có T7, khoảng ngược chiều, tùy chọn tính cả ngày cuối, cộng ngày làm việc bỏ qua T7/CN, cộng tháng vào ngày 31.
- `random-picker`: shuffle giữ nguyên tập phần tử (dùng random cố định), pickK, chia nhóm lệch nhau tối đa 1, các trường hợp K/N biên.
- `word-counter`: tiếng Việt có dấu, nhiều khoảng trắng, chuỗi rỗng, câu, đoạn, emoji.
- `line-tools`: sort tiếng Việt (á, â, đ…), bỏ trùng có/không phân biệt hoa thường, tiền tố có `{n}`.

## Chưa làm ở đợt này

- Trừ ngày lễ Việt Nam khi tính ngày làm việc.
- Gắn bộ đếm ngược với task hoặc deadline trong planner.
- Đồng bộ ghim qua Firestore.
- Wheel, Máy tính, Text Transform, Text Diff.
