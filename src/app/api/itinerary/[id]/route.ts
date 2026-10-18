import { db } from "@/lib/db";
import { parseItineraryDraft } from "@/lib/itinerary-input";
import { getCurrentUser } from "@/lib/session";
import type { ItineraryItem } from "@/types/itinerary";

const returningFields = `
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

export async function PUT(request: Request, context: RouteContext<"/api/itinerary/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const { id } = await context.params;
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
        UPDATE itinerary_items SET
          trip_id = $2::uuid, place_id = NULLIF($3, '')::uuid, trip_name = $4, title = $5, location = $6, category = $7,
          plan_date = $8::date, start_time = NULLIF($9, '')::time,
          end_time = NULLIF($10, '')::time, estimated_cost = $11, memo = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $13
        RETURNING ${returningFields}
      `,
      [id, draft.tripId, draft.placeId, trip.name, draft.title, draft.location, draft.category, draft.planDate, draft.startTime, draft.endTime, draft.estimatedCost, draft.memo, user.id],
    );
    if (!result.rows[0]) return Response.json({ message: "일정을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ item: result.rows[0] });
  } catch (error) {
    console.error("일정 수정 실패", error);
    return Response.json({ message: "여행 계획을 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/itinerary/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const { id } = await context.params;
    const result = await db.query("DELETE FROM itinerary_items WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (result.rowCount === 0) return Response.json({ message: "일정을 찾을 수 없습니다." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("일정 삭제 실패", error);
    return Response.json({ message: "여행 계획을 삭제하지 못했습니다." }, { status: 500 });
  }
}
