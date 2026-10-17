import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { parsePlaceDraft } from "@/lib/place-input";
import type { TravelPlace } from "@/types/travel-place";

const selectFields = `
  id,
  name,
  country,
  city,
  category,
  status,
  COALESCE(to_char(visit_date, 'YYYY-MM-DD'), '') AS "visitDate",
  memo,
  created_at::text AS "createdAt"
`;

export async function GET() {
  try {
    const result = await db.query<TravelPlace>(`
      SELECT ${selectFields}
      FROM travel_places
      ORDER BY created_at DESC
    `);

    return Response.json({ places: result.rows });
  } catch (error) {
    console.error("여행지 조회 실패", error);
    return Response.json({ message: "여행지를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const draft = parsePlaceDraft(await request.json());
    if (!draft) {
      return Response.json({ message: "입력한 여행지 정보를 확인해 주세요." }, { status: 400 });
    }

    const result = await db.query<TravelPlace>(
      `
        INSERT INTO travel_places (
          id, name, country, city, category, status, visit_date, memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::date, $8)
        RETURNING ${selectFields}
      `,
      [
        randomUUID(),
        draft.name,
        draft.country,
        draft.city,
        draft.category,
        draft.status,
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
