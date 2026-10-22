export interface PatchNote {
  /** ISO date (YYYY-MM-DD) the release went out. */
  date: string;
  title: string;
  changes: string[];
}

/** Newest first. Add a new entry at the top for each release. */
export const patchNotes: PatchNote[] = [
  {
    date: "2026-10-22",
    title: "Logo mới & trang đăng nhập mới",
    changes: [
      "Logo mới: trang planner với dấu tick và trái tim nhỏ, dùng cho sidebar và biểu tượng app.",
      "Làm lại trang đăng nhập với phần giới thiệu và bản xem trước kế hoạch hôm nay.",
    ],
  },
  {
    date: "2026-10-19",
    title: "Lịch sử & đồng bộ nhanh hơn",
    changes: [
      "Thêm mục Lịch sử: xem lại và khôi phục nhiệm vụ, sự kiện, tag, ghi chú đã sửa hoặc xoá.",
      "Lịch sử cũ hơn 30 ngày được tự động dọn mỗi tuần.",
      "Lưu dữ liệu trên máy và tải kế hoạch theo tháng để mở app nhanh hơn.",
      "Ghi nhớ các màu tuỳ chỉnh dùng gần đây, đồng bộ giữa các thiết bị.",
      "Thu gọn sidebar trên máy tính để có thêm chỗ cho lịch.",
      "Nút Cài đặt luôn nằm cuối sidebar.",
      "Thêm mục Về chúng tôi và Ghi chú cập nhật trong Cài đặt.",
    ],
  },
  {
    date: "2026-10-13",
    title: "Công cụ, ghi chú & giao diện tối",
    changes: [
      "Thêm tab Công cụ: hẹn giờ, tính ngày, chọn ngẫu nhiên, đếm chữ, xử lý dòng — có thể ghim vào sidebar.",
      "Thêm Ghi chú dạng checklist.",
      "Thêm lịch học lặp theo thứ trong tuần.",
      "Chọn giao diện Sáng, Tối hoặc Theo thiết bị.",
      "Lên lịch một mục cho nhiều ngày, chọn màu cho từng mục.",
      "Xem nhanh nhiệm vụ trong 7 ngày tới ngay trên sidebar.",
    ],
  },
  {
    date: "2026-10-12",
    title: "Bản dùng trên điện thoại",
    changes: [
      "Giao diện điện thoại với tông vàng ấm và lưu dữ liệu ổn định hơn.",
      "Thêm trang Hôm nay riêng.",
      "Sửa lỗi cửa sổ đăng nhập Google bị chặn.",
    ],
  },
  {
    date: "2026-10-11",
    title: "Ra mắt Bo do it",
    changes: ["Phiên bản đầu tiên: planner, nhiệm vụ và sự kiện, đăng nhập bằng Google."],
  },
];
