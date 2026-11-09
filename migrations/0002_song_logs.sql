-- 곡 변경 기록 (방장만 조회). 곡이 삭제되거나 멤버가 방을 나가도 읽을 수 있도록
-- 곡 제목·멤버 이름·작업자 이름을 기록 시점의 값으로 함께 저장한다.
CREATE TABLE song_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  song_id INTEGER,                     -- 삭제된 곡일 수 있어 FK 없음
  actor_id INTEGER NOT NULL REFERENCES users(id),
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,                -- 'create' | 'update' | 'delete'
  detail TEXT NOT NULL,                -- JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_song_logs_room ON song_logs(room_id, id);
