/** Thin client-side fetch helpers for the JSON API. */

export interface VaultEntryDTO {
  id: string;
  label: string;
  url: string | null;
  username: string | null;
  passwordCipher: string;
  passwordIv: string;
  notesCipher: string | null;
  notesIv: string | null;
  lastChangedAt: string;
  rotationDays: number | null;
  nextReminderAt: string | null;
  reminderDismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordHistoryDTO {
  id: string;
  passwordCipher: string;
  passwordIv: string;
  changedAt: string;
}

export interface DueItemDTO {
  id: string;
  label: string;
  url: string | null;
  lastChangedAt: string;
  reason: "rotation" | "stale";
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// --- auth ---
export const apiSignup = (body: unknown) => post("/api/auth/signup", body).then(jsonOrThrow);
export const apiLogin = (body: unknown) => post("/api/auth/login", body).then(jsonOrThrow);
export const apiLogout = () => post("/api/auth/logout", {}).then(jsonOrThrow);
export const apiGetSalts = (email: string) =>
  post("/api/auth/salts", { email }).then(
    jsonOrThrow<{ authSalt: string; encSalt: string; kdfIterations: number }>,
  );

// --- entries ---
export const apiListEntries = () =>
  fetch("/api/entries").then(jsonOrThrow<{ entries: VaultEntryDTO[] }>);

export const apiGetEntry = (id: string) =>
  fetch(`/api/entries/${id}`).then(
    jsonOrThrow<{ entry: VaultEntryDTO & { history: PasswordHistoryDTO[] } }>,
  );

export const apiCreateEntry = (body: unknown) =>
  post("/api/entries", body).then(jsonOrThrow<{ entry: VaultEntryDTO }>);

export const apiUpdateEntry = (id: string, body: unknown) =>
  fetch(`/api/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(jsonOrThrow<{ entry: VaultEntryDTO }>);

export const apiDeleteEntry = (id: string) =>
  fetch(`/api/entries/${id}`, { method: "DELETE" }).then(jsonOrThrow);

export const apiGetReminders = () =>
  fetch("/api/reminders").then(jsonOrThrow<{ due: DueItemDTO[]; count: number }>);
