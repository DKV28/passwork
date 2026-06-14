# 🔐 Passwork

Trình quản lý mật khẩu cá nhân chạy trên web, được xây để thay thế thói quen lưu
mật khẩu trong ghi chú điện thoại. Giải quyết hai nỗi đau chính:

1. **Bảo mật** — mật khẩu được **mã hóa** bằng master password, không lưu dạng văn bản thô.
2. **Hay quên cập nhật** — app **tự nhắc** khi mật khẩu đến hạn đổi hoặc đã quá lâu chưa đổi,
   và lưu **lịch sử mật khẩu** để bạn không bị nhầm lẫn.

## Mô hình bảo mật (zero-knowledge)

Server **không bao giờ** nhìn thấy master password hay mật khẩu thô. Mọi việc
mã hóa/giải mã diễn ra trong trình duyệt:

- Master password → PBKDF2 (SHA-256, 600.000 vòng) tạo ra **hai khóa với hai salt riêng**:
  - `encKey` (AES-GCM 256-bit) — chỉ nằm trong RAM trình duyệt, không bao giờ rời máy.
  - `authHash` — gửi lên server để xác thực; server lưu `argon2id(authHash)`.
- Mỗi mật khẩu được mã hóa AES-GCM với **IV ngẫu nhiên riêng** (kèm auth tag chống giả mạo).
- Server chỉ lưu ciphertext, salt, IV và verifier. Kho tự khóa sau 10 phút không hoạt động.

> ⚠️ **Quên master password = mất kho vĩnh viễn.** Đây là cái giá của zero-knowledge —
> hãy ghi nhớ thật kỹ master password.

## Công nghệ

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma + SQLite · Web Crypto API · argon2.

## Chạy thử

```bash
npm install
cp .env.example .env          # rồi điền SESSION_SECRET (xem hướng dẫn trong file)
npx prisma db push            # tạo file SQLite dev.db
npm run dev                   # mở http://localhost:3000
```

Build production: `npm run build && npm run start`.

## Kiểm thử

```bash
npm test          # unit test cho crypto + reminders (Vitest)
npx tsc --noEmit  # kiểm tra kiểu
```

## Cấu trúc chính

| Đường dẫn | Vai trò |
|---|---|
| `src/lib/crypto.ts` | Nơi DUY NHẤT gọi Web Crypto (derive khóa, mã hóa, giải mã, tạo mật khẩu). |
| `src/lib/reminders.ts` | Logic tính "đến hạn / cũ" cho tính năng nhắc. |
| `src/lib/session.ts` | Phiên đăng nhập bằng cookie ký HMAC. |
| `src/components/VaultProvider.tsx` | Giữ khóa mã hóa trong RAM + tự khóa. |
| `src/app/api/**` | API: auth, entries (CRUD + xoay vòng mật khẩu + lịch sử), reminders. |
| `src/app/**` | Trang: signup, unlock, dashboard, entries (new / chi tiết / lịch sử). |

## Tính năng

- Tạo kho + master password (kèm cảnh báo không khôi phục được).
- Thêm/sửa/xóa mục: tên, URL, tên đăng nhập, mật khẩu (mã hóa), ghi chú (mã hóa).
- Trình tạo mật khẩu mạnh.
- Xoay vòng mật khẩu: mật khẩu cũ tự động được lưu vào **lịch sử**.
- **Nhắc** đến hạn đổi (chu kỳ tùy chỉnh) và nhắc nhẹ khi mật khẩu quá cũ; hành động nhanh:
  *Cập nhật* / *Hoãn 30 ngày* / *Còn đúng*. Badge đếm số mục cần xem ở header.

## Hướng phát triển sau (chưa có trong MVP)

PWA + thông báo đẩy / email nhắc; mã hóa cả nhãn & URL; nâng KDF lên Argon2; 2FA;
kiểm tra rò rỉ (HIBP); khóa khôi phục.
