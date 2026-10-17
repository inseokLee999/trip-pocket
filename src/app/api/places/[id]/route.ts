import { db } from "@/lib/db";
import { parsePlaceDraft } from "@/lib/place-input";
import { getCurrentUser } from "@/lib/session";
import type { TravelPlace } from "@/types/travel-place";

const returningFields = `
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

export async function PUT(request: Request, context: RouteContext<"/api/places/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const { id } = await context.params;
    const draft = parsePlaceDraft(await request.json());
    if (!draft) {
      return Response.json({ message: "입력한 여행지 정보를 확인해 주세요." }, { status: 400 });
    }

    const result = await db.query<TravelPlace>(
      `
        UPDATE travel_places
        SET
          name = $2,
          country = $3,
          city = $4,
          category = $5,
          status = $6,
          trip_name = $7,
          priority = $8,
          estimated_cost = $9,
          visit_date = NULLIF($10, '')::date,
          memo = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $12
        RETURNING ${returningFields}
      `,
      [
        id,
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
        user.id,
      ],
    );

    if (!result.rows[0]) {
      return Response.json({ message: "여행지를 찾을 수 없습니다." }, { status: 404 });
    }

    return Response.json({ place: result.rows[0] });
  } catch (error) {
    console.error("여행지 수정 실패", error);
    return Response.json({ message: "여행지를 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/places/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const { id } = await context.params;
    const result = await db.query("DELETE FROM travel_places WHERE id = $1 AND user_id = $2", [id, user.id]);

    if (result.rowCount === 0) {
      return Response.json({ message: "여행지를 찾을 수 없습니다." }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("여행지 삭제 실패", error);
    return Response.json({ message: "여행지를 삭제하지 못했습니다." }, { status: 500 });
  }
}
