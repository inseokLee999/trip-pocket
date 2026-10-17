import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { parsePlaceDraft } from "@/lib/place-input";
import { getCurrentUser } from "@/lib/session";
import type { TravelPlace } from "@/types/travel-place";

const selectFields = `
  id,
  name,
  country,
  city,
  category,
  status,
  trip_name AS "tripName",
  priority,
  estimated_cost AS "estimatedCost",
  COALESCE(to_char(visit_date, 'YYYY-MM-DD'), '') AS "visitDate",
  memo,
  created_at::text AS "createdAt"
`;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const result = await db.query<TravelPlace>(
      `SELECT ${selectFields} FROM travel_places WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id],
    );

    return Response.json({ places: result.rows });
  } catch (error) {
    console.error("여행지 조회 실패", error);
    return Response.json({ message: "여행지를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const draft = parsePlaceDraft(await request.json());
    if (!draft) {
      return Response.json({ message: "입력한 여행지 정보를 확인해 주세요." }, { status: 400 });
    }

    const result = await db.query<TravelPlace>(
      `
        INSERT INTO travel_places (
          id, user_id, name, country, city, category, status, trip_name, priority, estimated_cost, visit_date, memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULLIF($11, '')::date, $12)
        RETURNING ${selectFields}
      `,
      [
        randomUUID(),
        user.id,
        draft.name,
        draft.country,
        draft.city,
        draft.category,
        draft.status,
        draft.tripName,
        draft.priority,
        draft.estimatedCost,
        draft.visitDate,
        draft.memo,
      ],
    );

    return Response.json({ place: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("여행지 저장 실패", error);
    return Response.json({ message: "여행지를 저장하지 못했습니다." }, { status: 500 });
  }
}
