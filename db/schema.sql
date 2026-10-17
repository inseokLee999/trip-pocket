CREATE TABLE IF NOT EXISTS travel_places (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(80) NOT NULL,
  city VARCHAR(80) NOT NULL,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('관광지', '자연', '맛집', '숙소', '휴양', '기타')),
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('wishlist', 'visited')),
  visit_date DATE,
  memo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS travel_places_status_idx
  ON travel_places (status);

CREATE INDEX IF NOT EXISTS travel_places_category_idx
  ON travel_places (category);

CREATE INDEX IF NOT EXISTS travel_places_visit_date_idx
  ON travel_places (visit_date);

INSERT INTO travel_places (
  id,
  name,
  country,
  city,
  category,
  status,
  visit_date,
  memo,
  created_at,
  updated_at
)
VALUES
  (
    '5bf075ea-8516-4c6f-b371-8a296c468a92',
    '성산일출봉',
    '대한민국',
    '제주',
    '자연',
    'wishlist',
    '2026-11-08',
    '해 뜨기 전에 도착해서 일출 보기',
    '2026-10-01T09:00:00+09:00',
    '2026-10-01T09:00:00+09:00'
  ),
  (
    'a792ab72-416b-48d6-ae3c-97b6d9a9d155',
    '아라시야마',
    '일본',
    '교토',
    '관광지',
    'wishlist',
    '2027-03-21',
    '아침 일찍 대나무 숲 산책하기',
    '2026-10-03T09:00:00+09:00',
    '2026-10-03T09:00:00+09:00'
  ),
  (
    'c74e9271-5003-4aad-aa21-ce4e765fb8bc',
    '해운대 해수욕장',
    '대한민국',
    '부산',
    '휴양',
    'visited',
    '2026-08-16',
    '해변 열차 타고 청사포까지 이동',
    '2026-08-01T09:00:00+09:00',
    '2026-08-01T09:00:00+09:00'
  )
ON CONFLICT (id) DO NOTHING;
