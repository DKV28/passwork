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

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma + libSQL/Turso
(file SQLite khi dev) · Web Crypto API · argon2.

## Chạy thử (local)

```bash
npm install
cp .env.example .env          # điền SESSION_SECRET (xem hướng dẫn trong file)
npx prisma db push            # tạo file SQLite prisma/dev.db
npm run dev                   # mở http://localhost:3000
```

Build production: `npm run build && npm run start`.

## Triển khai lên Vercel + Turso

SQLite dạng file **không chạy được trên Vercel** (filesystem chỉ đọc, không lưu
được dữ liệu). App dùng driver adapter libSQL nên ở production ta trỏ tới
[Turso](https://turso.tech) (SQLite-compatible, có gói miễn phí):

1. Tạo database Turso và lấy thông tin kết nối:
   ```bash
   turso db create passwork
   turso db show passwork --url            # -> TURSO_DATABASE_URL (libsql://…)
   turso db tokens create passwork         # -> TURSO_AUTH_TOKEN
   ```
2. Đặt `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN` vào file `.env`, rồi **áp schema
   lên Turso bằng một lệnh** (không cần Turso CLI cho bước này):
   ```bash
   npm run db:deploy
   ```
   Lệnh này an toàn khi chạy lại (bỏ qua bảng đã tồn tại). **Bắt buộc** chạy bước
   này — thiếu nó, đăng ký/đăng nhập trên production sẽ báo lỗi 500 (chưa có bảng).
3. Trong Vercel → Project → Settings → Environment Variables, đặt:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`.
4. Deploy. Khi không có `TURSO_DATABASE_URL`, app tự dùng file SQLite local nên
   môi trường dev không cần Turso.

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
