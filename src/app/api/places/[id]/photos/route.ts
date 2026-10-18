import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { PlacePhoto } from "@/types/place-photo";
import { connection } from "next/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxBytes = 5 * 1024 * 1024;
const maxPhotos = 5;

export async function GET(_request: Request, context: RouteContext<"/api/places/[id]/photos">) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const { id } = await context.params;
    const place = await db.query("SELECT 1 FROM travel_places WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!place.rowCount) return Response.json({ message: "여행지를 찾을 수 없습니다." }, { status: 404 });
    const result = await db.query<PlacePhoto>(
      `SELECT id, file_name AS "fileName", byte_size AS "byteSize", '/api/places/' || place_id || '/photos/' || id AS url, created_at::text AS "createdAt" FROM travel_place_photos WHERE place_id = $1 AND user_id = $2 ORDER BY created_at`,
      [id, user.id],
    );
    return Response.json({ photos: result.rows });
  } catch (error) {
    console.error("여행지 사진 조회 실패", error);
    return Response.json({ message: "사진을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext<"/api/places/[id]/photos">) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const { id } = await context.params;
    const place = await db.query("SELECT 1 FROM travel_places WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!place.rowCount) return Response.json({ message: "여행지를 찾을 수 없습니다." }, { status: 404 });
    const count = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM travel_place_photos WHERE place_id = $1 AND user_id = $2", [id, user.id]);
    if ((count.rows[0]?.count ?? 0) >= maxPhotos) return Response.json({ message: "사진은 여행지당 최대 5장까지 추가할 수 있습니다." }, { status: 400 });

    const formData = await request.formData();
    const file = formData.get("photo");
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size <= 0 || file.size > maxBytes) {
      return Response.json({ message: "5MB 이하의 JPG, PNG, WebP 또는 GIF 사진을 선택해 주세요." }, { status: 400 });
    }
    const photoId = randomUUID();
    await db.query(
      `INSERT INTO travel_place_photos (id, user_id, place_id, file_name, mime_type, byte_size, image_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [photoId, user.id, id, file.name.slice(0, 255), file.type, file.size, Buffer.from(await file.arrayBuffer())],
    );
    const photo: PlacePhoto = { id: photoId, fileName: file.name, byteSize: file.size, url: `/api/places/${id}/photos/${photoId}`, createdAt: new Date().toISOString() };
    return Response.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("여행지 사진 저장 실패", error);
    return Response.json({ message: "사진을 저장하지 못했습니다." }, { status: 500 });
  }
}
