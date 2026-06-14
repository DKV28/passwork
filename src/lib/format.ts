import { daysBetween } from "@/lib/reminders";

/** Format a date as a Vietnamese short date. */
export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Human-friendly age of a password, e.g. "đổi 12 ngày trước". */
export function ageLabel(lastChangedAt: string | Date): string {
  const date = typeof lastChangedAt === "string" ? new Date(lastChangedAt) : lastChangedAt;
  const days = daysBetween(new Date(), date);
  if (days <= 0) return "đổi hôm nay";
  if (days === 1) return "đổi 1 ngày trước";
  if (days < 30) return `đổi ${days} ngày trước`;
  if (days < 365) return `đổi ${Math.floor(days / 30)} tháng trước`;
  return `đổi ${Math.floor(days / 365)} năm trước`;
}

export const reasonLabel: Record<"rotation" | "stale", string> = {
  rotation: "Đến hạn đổi mật khẩu",
  stale: "Mật khẩu đã lâu chưa đổi — còn dùng được không?",
};
