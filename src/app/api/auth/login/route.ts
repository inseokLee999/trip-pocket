import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import type { AuthUser } from "@/types/user";

type UserWithPassword = AuthUser & { passwordHash: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json({ message: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  try {
    const result = await db.query<UserWithPassword>(
      `SELECT id, name, email, password_hash AS "passwordHash" FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("로그인 실패", error);
    return Response.json({ message: "로그인하지 못했습니다." }, { status: 500 });
  }
}
