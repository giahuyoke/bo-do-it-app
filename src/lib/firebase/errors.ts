/** Keep drafts intact and give users an actionable message for failed writes. */
export function firebaseErrorMessage(error: unknown, fallback: string): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "permission-denied") {
    return "Chưa thể lưu vì quyền truy cập dữ liệu bị từ chối. Nội dung của bạn vẫn được giữ lại. Hãy thử đăng nhập lại; nếu vẫn lỗi, cần kiểm tra cấu hình quyền trên máy chủ.";
  }
  if (code === "unauthenticated") return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.";
  if (code === "unavailable") return "Kết nối đang gián đoạn. Vui lòng kiểm tra mạng và thử lại.";
  return error instanceof Error ? error.message : fallback;
}
