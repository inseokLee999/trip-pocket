import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import type { AuthUser } from "@/types/user";

function normalizeSignupInput(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (name.length < 2 || name.length > 60) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return null;
  if (password.length < 8 || password.length > 100) return null;
  return { name, email, password };
}

export async function POST(request: Request) {
  const input = normalizeSignupInput(await request.json().catch(() => null));
  if (!input) {
    return Response.json(
      { message: "이름, 이메일과 8자 이상의 비밀번호를 확인해 주세요." },
      { status: 400 },
    );
  }

  const client = await db.connect();
  try {
    const passwordHash = await hashPassword(input.password);
    const userId = randomUUID();

    await client.query("BEGIN");
    const countResult = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
    const result = await client.query<AuthUser>(
      `
        INSERT INTO users (id, name, email, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email
      `,
      [userId, input.name, input.email, passwordHash],
    );

    if (countResult.rows[0]?.count === "0") {
      await client.query("UPDATE travel_places SET user_id = $1 WHERE user_id IS NULL", [userId]);
    }
    await client.query("COMMIT");

    await createSession(userId);
    return Response.json({ user: result.rows[0] }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if ((error as { code?: string }).code === "23505") {
      return Response.json({ message: "이미 가입된 이메일입니다." }, { status: 409 });
    }
    console.error("회원가입 실패", error);
    return Response.json({ message: "회원가입을 완료하지 못했습니다." }, { status: 500 });
  } finally {
    client.release();
  }
}
