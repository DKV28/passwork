import type { Metadata, Viewport } from "next";
import "./globals.css";
import { VaultProvider } from "@/components/VaultProvider";

export const metadata: Metadata = {
  title: "Passwork — Trình quản lý mật khẩu",
  description: "Kho mật khẩu mã hóa với nhắc đổi mật khẩu và lịch sử thay đổi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <VaultProvider>{children}</VaultProvider>
      </body>
    </html>
  );
}
