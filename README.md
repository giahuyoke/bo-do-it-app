# Bo Do It

Dự án Next.js sử dụng App Router, TypeScript, Tailwind CSS và Ant Design.

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

## Cấu trúc chính

```text
src/
  app/
    globals.css       # Tailwind CSS và thứ tự CSS layer
    layout.tsx        # Layout gốc, metadata và Ant Design SSR registry
    page.tsx          # Trang chủ
  components/
    providers.tsx     # Ant Design theme, locale tiếng Việt và App context
    starter-card.tsx  # Component mẫu với thông báo tương tác
```

Alias `@/*` trỏ tới `src/*`.

Ant Design được tích hợp SSR qua `@ant-design/nextjs-registry` để các component có style ngay khi render từ server. `StyleProvider` dùng layer `antd`; các layer được khai báo theo thứ tự `theme, base, antd, components, utilities`, cho phép Tailwind utility tùy chỉnh style của component.

Khi component sử dụng sự kiện, hook hoặc các API như `App.useApp()`, thêm `"use client"` ở đầu file. Các trang và layout vẫn có thể dùng Server Components.

## Tài liệu

- [Next.js](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Ant Design với Next.js](https://ant.design/docs/react/use-with-next/)
- [Thứ tự CSS layer của Ant Design và Tailwind](https://ant.design/docs/react/compatible-style/)
