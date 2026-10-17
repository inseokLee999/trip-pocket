import { deleteCurrentSession } from "@/lib/session";

export async function POST() {
  await deleteCurrentSession();
  return new Response(null, { status: 204 });
}
