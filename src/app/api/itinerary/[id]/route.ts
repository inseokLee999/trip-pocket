import { db } from "@/lib/db";
import { parseItineraryDraft } from "@/lib/itinerary-input";
import { getCurrentUser } from "@/lib/session";
import type { ItineraryItem } from "@/types/itinerary";

const returningFields = `
  id,
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

    const result = await db.query<ItineraryItem>(
      `
        UPDATE itinerary_items SET
          trip_name = $2, title = $3, location = $4, category = $5,
          plan_date = $6::date, start_time = NULLIF($7, '')::time,
          end_time = NULLIF($8, '')::time, estimated_cost = $9, memo = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $11
        RETURNING ${returningFields}
      `,
      [id, draft.tripName, draft.title, draft.location, draft.category, draft.planDate, draft.startTime, draft.endTime, draft.estimatedCost, draft.memo, user.id],
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
