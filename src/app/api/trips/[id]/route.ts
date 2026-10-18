import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { parseTripDraft } from "@/lib/trip-input";
import type { Trip } from "@/types/trip";

const returningFields = `
  id,
  name,
  destination,
  to_char(start_date, 'YYYY-MM-DD') AS "startDate",
  to_char(end_date, 'YYYY-MM-DD') AS "endDate",
  created_at::text AS "createdAt"
`;

export async function PUT(request: Request, context: RouteContext<"/api/trips/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const { id } = await context.params;
    const draft = parseTripDraft(await request.json().catch(() => null));
    if (!draft) return Response.json({ message: "여행 이름과 올바른 기간을 입력해 주세요." }, { status: 400 });
    const currentTrip = await db.query<{ name: string }>("SELECT name FROM trips WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!currentTrip.rows[0]) return Response.json({ message: "여행을 찾을 수 없습니다." }, { status: 404 });

    const outsideRange = await db.query(
      `SELECT 1 FROM itinerary_items WHERE trip_id = $1 AND user_id = $2 AND (plan_date < $3::date OR plan_date > $4::date) LIMIT 1`,
      [id, user.id, draft.startDate, draft.endDate],
    );
    if (outsideRange.rowCount) {
      return Response.json({ message: "새 기간 밖에 저장된 일정이 있어 기간을 변경할 수 없습니다." }, { status: 409 });
    }

    const result = await db.query<Trip>(
      `
        UPDATE trips SET
          name = $2, destination = $3, start_date = $4::date, end_date = $5::date, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $6
        RETURNING ${returningFields}
      `,
      [id, draft.name, draft.destination, draft.startDate, draft.endDate, user.id],
    );
    if (!result.rows[0]) return Response.json({ message: "여행을 찾을 수 없습니다." }, { status: 404 });

    await db.query(
      `UPDATE itinerary_items SET trip_name = $2, updated_at = CURRENT_TIMESTAMP WHERE trip_id = $1 AND user_id = $3`,
      [id, draft.name, user.id],
    );
    await db.query(
      `UPDATE travel_places SET trip_name = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND trip_name = $3`,
      [draft.name, user.id, currentTrip.rows[0].name],
    );
    return Response.json({ trip: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return Response.json({ message: "같은 이름의 여행이 이미 있습니다." }, { status: 409 });
    }
    console.error("여행 수정 실패", error);
    return Response.json({ message: "여행을 수정하지 못했습니다." }, { status: 500 });
  }
}
