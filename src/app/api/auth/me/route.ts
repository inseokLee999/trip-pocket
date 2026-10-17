import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
  return Response.json({ user });
}
