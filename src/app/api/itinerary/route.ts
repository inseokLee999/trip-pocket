import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { parseItineraryDraft } from "@/lib/itinerary-input";
import { getCurrentUser } from "@/lib/session";
import type { ItineraryItem } from "@/types/itinerary";

const selectFields = `
  id,
  COALESCE(trip_id::text, '') AS "tripId",
  COALESCE(place_id::text, '') AS "placeId",
  trip_name AS "tripName",
  title,
  location,
  category,
  to_char(plan_date, 'YYYY-MM-DD') AS "planDate",
  COALESCE(to_char(start_time, 'HH24:MI'), '') AS "startTime",
  COALESCE(to_char(end_time, 'HH24:MI'), '') AS "endTime",
  estimated_cost AS "estimatedCost",
  memo,
  created_at::text AS "createdAt"
`;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const result = await db.query<ItineraryItem>(
      `SELECT ${selectFields} FROM itinerary_items WHERE user_id = $1 ORDER BY plan_date, start_time NULLS LAST, created_at`,
      [user.id],
    );
    return Response.json({ items: result.rows });
  } catch (error) {
    console.error("일정 조회 실패", error);
    return Response.json({ message: "여행 계획을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const draft = parseItineraryDraft(await request.json().catch(() => null));
    if (!draft) return Response.json({ message: "입력한 일정 정보를 확인해 주세요." }, { status: 400 });
    const tripResult = await db.query<{ name: string; startDate: string; endDate: string }>(
      `SELECT name, to_char(start_date, 'YYYY-MM-DD') AS "startDate", to_char(end_date, 'YYYY-MM-DD') AS "endDate" FROM trips WHERE id = $1 AND user_id = $2`,
      [draft.tripId, user.id],
    );
    const trip = tripResult.rows[0];
    if (!trip) return Response.json({ message: "여행을 찾을 수 없습니다." }, { status: 400 });
    if (draft.planDate < trip.startDate || draft.planDate > trip.endDate) {
      return Response.json({ message: `일정 날짜는 ${trip.startDate}부터 ${trip.endDate} 사이여야 합니다.` }, { status: 400 });
    }
    if (draft.placeId) {
      const place = await db.query("SELECT 1 FROM travel_places WHERE id = $1 AND user_id = $2", [draft.placeId, user.id]);
      if (!place.rowCount) return Response.json({ message: "연결할 여행지를 찾을 수 없습니다." }, { status: 400 });
    }

    const result = await db.query<ItineraryItem>(
      `
        INSERT INTO itinerary_items (
          id, user_id, trip_id, place_id, trip_name, title, location, category, plan_date, start_time, end_time, estimated_cost, memo
        ) VALUES (
          $1, $2, $3::uuid, NULLIF($4, '')::uuid, $5, $6, $7, $8, $9::date, NULLIF($10, '')::time, NULLIF($11, '')::time, $12, $13
        )
        RETURNING ${selectFields}
      `,
      [randomUUID(), user.id, draft.tripId, draft.placeId, trip.name, draft.title, draft.location, draft.category, draft.planDate, draft.startTime, draft.endTime, draft.estimatedCost, draft.memo],
    );
    return Response.json({ item: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("일정 저장 실패", error);
    return Response.json({ message: "여행 계획을 저장하지 못했습니다." }, { status: 500 });
  }
}
