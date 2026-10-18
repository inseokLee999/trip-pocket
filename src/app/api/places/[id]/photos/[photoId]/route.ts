import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { connection } from "next/server";

type PhotoRow = { data: Buffer; mimeType: string; fileName: string };

export async function GET(_request: Request, context: RouteContext<"/api/places/[id]/photos/[photoId]">) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const { id, photoId } = await context.params;
    const result = await db.query<PhotoRow>(
      `SELECT image_data AS data, mime_type AS "mimeType", file_name AS "fileName" FROM travel_place_photos WHERE id = $1 AND place_id = $2 AND user_id = $3`,
      [photoId, id, user.id],
    );
    const photo = result.rows[0];
    if (!photo) return Response.json({ message: "사진을 찾을 수 없습니다." }, { status: 404 });
    return new Response(new Uint8Array(photo.data), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(photo.fileName)}`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("여행지 사진 전송 실패", error);
    return Response.json({ message: "사진을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/places/[id]/photos/[photoId]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const { id, photoId } = await context.params;
    const result = await db.query("DELETE FROM travel_place_photos WHERE id = $1 AND place_id = $2 AND user_id = $3", [photoId, id, user.id]);
    if (!result.rowCount) return Response.json({ message: "사진을 찾을 수 없습니다." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("여행지 사진 삭제 실패", error);
    return Response.json({ message: "사진을 삭제하지 못했습니다." }, { status: 500 });
  }
}
