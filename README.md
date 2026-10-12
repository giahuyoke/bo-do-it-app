# Bo Do It

Dự án quản lý công việc và lịch trình dùng Next.js App Router, TypeScript,
Tailwind CSS, Ant Design, Firebase Authentication và Cloud Firestore.

Giao diện được thiết kế theo hướng calendar-first: lịch tháng là trung tâm, có
thêm chế độ tuần/danh sách, tìm kiếm, lọc lịch trình hoặc nhiệm vụ, panel việc
trong ngày, nhắc hẹn, tag màu và Drawer thêm nhanh.

## Chạy ở môi trường phát triển

Yêu cầu Node.js 20.9 trở lên và npm.

```bash
npm ci
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Các lệnh

```bash
npm run lint       # Kiểm tra ESLint
npm run typecheck  # Kiểm tra TypeScript
npm run build      # Build production
npm start          # Chạy bản production sau khi build
```

## Kết nối Firebase

1. Xác nhận đúng Firebase project ID trước khi thao tác tài nguyên.
2. Trong Firebase Console, đăng ký hoặc tái sử dụng Web App.
3. Bật Authentication > Sign-in method > Google.
4. Tạo Cloud Firestore ở Native mode nếu project chưa có database. Hãy chọn region
   cẩn thận vì không thể đổi region của database sau khi tạo.
5. Sao chép `.env.example` thành `.env.local` và điền cấu hình Web App.

Project mặc định trong `.firebaserc` là `bo-do-it`. Luôn kiểm tra lại project
trước khi deploy và xem/kiểm thử `firestore.rules` trước khi cập nhật production:

```bash
npx -y firebase-tools@latest emulators:start --only firestore --project demo-bo-do-it
# Chỉ deploy sau khi đã phê duyệt project và rules:
npx -y firebase-tools@latest deploy --only firestore:rules --project <project-id>
```

Ứng dụng lưu dữ liệu theo UID:

```text
users/{uid}/tasks/{taskId}
users/{uid}/events/{eventId}
users/{uid}/tags/{tagId}
```

Rules chỉ cho phép người dùng đã đăng nhập đọc/ghi các subcollection thuộc UID
của chính họ, đồng thời kiểm tra kiểu dữ liệu, độ dài chuỗi, enum và timestamp.

## Cấu trúc chính

```text
src/
  app/
    globals.css       # Tailwind CSS và thứ tự CSS layer
    layout.tsx        # Layout gốc, metadata và Ant Design SSR registry
    page.tsx          # Auth gate và dashboard
  components/
    auth/             # Google Sign-In và trạng thái đăng nhập
    dashboard/        # Shell, sidebar, topbar, toolbar và panel trong ngày
    planner/          # Calendar, Drawer, quản lý tag và các field theo loại
    events/           # CRUD lịch trình
    tasks/            # CRUD công việc
    providers.tsx     # Ant Design theme, locale và Auth context
  hooks/              # Firestore listeners và logic tổng hợp dashboard
  lib/firebase/       # Firebase client, models và CRUD services
```

Alias `@/*` trỏ tới `src/*`.

Ant Design được tích hợp SSR qua `@ant-design/nextjs-registry` để các component có style ngay khi render từ server. `StyleProvider` dùng layer `antd`; các layer được khai báo theo thứ tự `theme, base, antd, components, utilities`, cho phép Tailwind utility tùy chỉnh style của component.

Khi component sử dụng sự kiện, hook hoặc các API như `App.useApp()`, thêm `"use client"` ở đầu file. Các trang và layout vẫn có thể dùng Server Components.

Realtime dùng `onSnapshot()` và luôn hủy listener khi component unmount. Kiến trúc
này chỉ dùng Authentication và Firestore, phù hợp Spark Plan; không dùng Cloud
Functions hoặc dịch vụ yêu cầu billing.

## Tài liệu

- [Next.js](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Ant Design với Next.js](https://ant.design/docs/react/use-with-next/)
- [Thứ tự CSS layer của Ant Design và Tailwind](https://ant.design/docs/react/compatible-style/)
