import type { Metadata, Viewport } from "next";
import "./globals.css";
import { VaultProvider } from "@/components/VaultProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Passwork — Trình quản lý mật khẩu",
  description: "Kho mật khẩu mã hóa với nhắc đổi mật khẩu và lịch sử thay đổi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Runs before React hydrates to apply the saved theme with no flash of the
// wrong colour scheme. Falls back to the OS preference when nothing is saved.
const themeScript = `
try {
  var t = localStorage.getItem('pw_theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <VaultProvider>{children}</VaultProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
