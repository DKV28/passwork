-- Passwork — DDL để tạo bảng trong Supabase (Postgres).
-- Dán TOÀN BỘ file này vào Supabase → SQL Editor → Run.
-- An toàn chạy lại nhiều lần (dùng IF NOT EXISTS), nên nếu bạn đã tạo
-- bảng "User" trước đó thì các lệnh dưới đây sẽ chỉ tạo phần còn thiếu
-- (VaultEntry, PasswordHistory) mà không báo lỗi.

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authSalt" TEXT NOT NULL,
    "encSalt" TEXT NOT NULL,
    "serverHash" TEXT NOT NULL,
    "kdfIterations" INTEGER NOT NULL DEFAULT 600000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VaultEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "username" TEXT,
    "passwordCipher" TEXT NOT NULL,
    "passwordIv" TEXT NOT NULL,
    "notesCipher" TEXT,
    "notesIv" TEXT,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotationDays" INTEGER,
    "nextReminderAt" TIMESTAMP(3),
    "reminderDismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordHistory" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "passwordCipher" TEXT NOT NULL,
    "passwordIv" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VaultEntry_userId_idx" ON "VaultEntry"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordHistory_entryId_idx" ON "PasswordHistory"("entryId");

-- AddForeignKey (chỉ thêm nếu chưa tồn tại)
DO $$ BEGIN
    ALTER TABLE "VaultEntry" ADD CONSTRAINT "VaultEntry_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey (chỉ thêm nếu chưa tồn tại)
DO $$ BEGIN
    ALTER TABLE "PasswordHistory" ADD CONSTRAINT "PasswordHistory_entryId_fkey"
        FOREIGN KEY ("entryId") REFERENCES "VaultEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
