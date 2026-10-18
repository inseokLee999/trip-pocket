import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { parseTripDraft } from "@/lib/trip-input";
import type { Trip } from "@/types/trip";

const selectFields = `
  id,
  name,
  destination,
  to_char(start_date, 'YYYY-MM-DD') AS "startDate",
  to_char(end_date, 'YYYY-MM-DD') AS "endDate",
  created_at::text AS "createdAt"
`;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const result = await db.query<Trip>(
      `SELECT ${selectFields} FROM trips WHERE user_id = $1 ORDER BY start_date, created_at`,
      [user.id],
    );
    return Response.json({ trips: result.rows });
  } catch (error) {
    console.error("여행 조회 실패", error);
    return Response.json({ message: "여행 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const draft = parseTripDraft(await request.json().catch(() => null));
    if (!draft) return Response.json({ message: "여행 이름과 올바른 기간을 입력해 주세요." }, { status: 400 });

    const result = await db.query<Trip>(
      `
        INSERT INTO trips (id, user_id, name, destination, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5::date, $6::date)
        RETURNING ${selectFields}
      `,
      [randomUUID(), user.id, draft.name, draft.destination, draft.startDate, draft.endDate],
    );
    return Response.json({ trip: result.rows[0] }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return Response.json({ message: "같은 이름의 여행이 이미 있습니다." }, { status: 409 });
    }
    console.error("여행 저장 실패", error);
    return Response.json({ message: "여행을 저장하지 못했습니다." }, { status: 500 });
  }
}
