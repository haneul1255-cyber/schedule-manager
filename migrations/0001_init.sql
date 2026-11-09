-- 참고: Cloudflare D1은 외래키 제약을 항상 강제한다(PRAGMA foreign_keys = ON 상태와 동일).
-- 연결마다 PRAGMA를 켤 필요는 없고, 마이그레이션 중 일시 해제가 필요하면
-- PRAGMA defer_foreign_keys = true 를 사용한다.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  invite_code TEXT UNIQUE NOT NULL,
  day_start INTEGER NOT NULL,          -- 자정부터의 분, 예: 600 = 10:00
  day_end INTEGER NOT NULL,            -- 예: 1440 = 24:00
  slot_minutes INTEGER NOT NULL DEFAULT 30,
  created_at INTEGER NOT NULL
);

CREATE TABLE room_dates (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                  -- 'YYYY-MM-DD'
  PRIMARY KEY (room_id, date)
);

CREATE TABLE room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  instrument TEXT,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL
);

CREATE TABLE song_members (
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (song_id, user_id)
);

CREATE TABLE availability (
  room_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  slots TEXT NOT NULL,                 -- '0011110000...' 슬롯 수만큼의 0/1 문자열
  PRIMARY KEY (room_id, user_id, date)
);

-- 조회 성능용 보조 인덱스 (스키마 자체는 변경하지 않음)
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_songs_room ON songs(room_id);
CREATE INDEX idx_song_members_user ON song_members(user_id);
