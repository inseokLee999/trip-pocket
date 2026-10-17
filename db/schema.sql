CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

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

ALTER TABLE travel_places
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE travel_places
  ADD COLUMN IF NOT EXISTS trip_name VARCHAR(80) NOT NULL DEFAULT '내 여행';

ALTER TABLE travel_places
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'interested'
    CHECK (priority IN ('must', 'interested', 'later'));

ALTER TABLE travel_places
  ADD COLUMN IF NOT EXISTS estimated_cost INTEGER NOT NULL DEFAULT 0
    CHECK (estimated_cost >= 0 AND estimated_cost <= 100000000);

CREATE INDEX IF NOT EXISTS travel_places_user_id_idx
  ON travel_places (user_id);

CREATE INDEX IF NOT EXISTS travel_places_user_trip_idx
  ON travel_places (user_id, trip_name);

CREATE INDEX IF NOT EXISTS travel_places_status_idx
  ON travel_places (status);

CREATE INDEX IF NOT EXISTS travel_places_category_idx
  ON travel_places (category);

CREATE INDEX IF NOT EXISTS travel_places_visit_date_idx
  ON travel_places (visit_date);

CREATE TABLE IF NOT EXISTS itinerary_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id UUID REFERENCES travel_places(id) ON DELETE SET NULL,
  trip_name VARCHAR(80) NOT NULL,
  title VARCHAR(120) NOT NULL,
  location VARCHAR(200) NOT NULL,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('transport', 'sightseeing', 'food', 'stay', 'shopping', 'other')),
  plan_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  estimated_cost INTEGER NOT NULL DEFAULT 0
    CHECK (estimated_cost >= 0 AND estimated_cost <= 100000000),
  memo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE itinerary_items
  ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES travel_places(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS itinerary_items_user_date_idx
  ON itinerary_items (user_id, plan_date, start_time);

CREATE INDEX IF NOT EXISTS itinerary_items_user_trip_idx
  ON itinerary_items (user_id, trip_name);

CREATE INDEX IF NOT EXISTS itinerary_items_user_place_idx
  ON itinerary_items (user_id, place_id);

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
