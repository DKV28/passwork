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

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma + Postgres
(Supabase) · Web Crypto API.

## Chạy thử (local)

```bash
npm install
cp .env.example .env          # điền DATABASE_URL (Postgres) + SESSION_SECRET
npx prisma db push            # tạo bảng trong database
npm run dev                   # mở http://localhost:3000
```

Build production: `npm run build && npm run start`.

## Triển khai lên Vercel + Supabase

1. Tạo project tại [Supabase](https://supabase.com).
2. Vào **SQL Editor**, mở file [`prisma/schema.sql`](prisma/schema.sql), copy **toàn bộ**
   nội dung, dán vào rồi bấm **Run** để tạo cả 3 bảng (`User`, `VaultEntry`,
   `PasswordHistory`). File này an toàn chạy lại nhiều lần, nên nếu trước đó bạn mới
   tạo được bảng `User` thì chạy lại sẽ bổ sung 2 bảng còn thiếu. (Không cần CLI.)
3. Vào **Settings → Database → Connection string**, copy chuỗi **Transaction pooler
   (cổng 6543)** — giữ tham số `?pgbouncer=true` để hợp với serverless.
4. Trong Vercel → Project → Settings → Environment Variables, đặt:
   `DATABASE_URL` (chuỗi pooler ở bước 3) và `SESSION_SECRET` (chuỗi ngẫu nhiên dài).
5. **Redeploy**. Đăng ký/đăng nhập sẽ hoạt động.

> Thiếu schema (bước 2) hoặc thiếu env (bước 4) sẽ gây lỗi 500. Lưu ý: nếu đăng
> nhập được nhưng **lưu mục bị 500**, gần như chắc chắn bảng `VaultEntry` chưa được
> tạo — hãy chạy lại `prisma/schema.sql` ở bước 2.

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
