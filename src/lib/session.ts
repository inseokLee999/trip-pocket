import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import type { AuthUser } from "@/types/user";

const cookieName = "trip_pocket_session";
const sessionDurationSeconds = 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);

  await db.query("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP");
  await db.query(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [randomUUID(), userId, hashToken(token), expiresAt],
  );

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  const result = await db.query<AuthUser>(
    `
      SELECT users.id, users.name, users.email
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = $1
        AND sessions.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `,
    [hashToken(token)],
  );

  return result.rows[0] ?? null;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) {
    await db.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  cookieStore.delete(cookieName);
}
