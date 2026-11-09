import { HttpError } from './http';
import type { SessionUser } from './types';

export interface SongLogMember {
  id: number;
  name: string;
}
export interface SongSnapshot {
  title: string;
  members: SongLogMember[];
}
export type SongLogDetail =
  | { action: 'create'; after: SongSnapshot }
  | { action: 'update'; before: SongSnapshot; after: SongSnapshot }
  | { action: 'delete'; before: SongSnapshot };

/**
 * memberIds가 전부 이 방의 멤버인지 확인하고, 로그에 남길 이름과 함께 돌려준다.
 * 하나라도 아니면 400.
 */
export async function resolveRoomMembers(
  db: D1Database,
  roomId: string,
  memberIds: number[],
): Promise<SongLogMember[]> {
  if (memberIds.length === 0) return [];
  const { results } = await db
    .prepare(
      `SELECT u.id, u.display_name AS name FROM room_members m JOIN users u ON u.id = m.user_id
        WHERE m.room_id = ? AND m.user_id IN (SELECT value FROM json_each(?))`,
    )
    .bind(roomId, JSON.stringify(memberIds))
    .all<SongLogMember>();
  if (results.length !== memberIds.length) {
    throw new HttpError(400, '곡 멤버는 이 방의 멤버여야 합니다.');
  }
  const byId = new Map(results.map((r) => [r.id, r]));
  return memberIds.map((id) => byId.get(id)!);
}

/** 곡의 현재 제목과 멤버 (이름 포함) */
export async function songSnapshot(db: D1Database, songId: number): Promise<SongSnapshot | null> {
  const [songRes, membersRes] = await db.batch([
    db.prepare('SELECT title FROM songs WHERE id = ?').bind(songId),
    db
      .prepare(
        `SELECT u.id, u.display_name AS name FROM song_members sm JOIN users u ON u.id = sm.user_id
          WHERE sm.song_id = ? ORDER BY u.display_name`,
      )
      .bind(songId),
  ]);
  const song = (songRes.results as { title: string }[])[0];
  if (!song) return null;
  return { title: song.title, members: membersRes.results as SongLogMember[] };
}

/**
 * 로그 INSERT 구문. songIdSql은 곡 ID를 돌려주는 SQL 식(새 곡은 서브쿼리)이다.
 */
export function logStatement(
  db: D1Database,
  roomId: string,
  songId: number | null,
  actor: SessionUser,
  detail: SongLogDetail,
): D1PreparedStatement {
  const { action, ...rest } = detail;
  const songIdExpr = songId === null ? '(SELECT MAX(id) FROM songs WHERE room_id = ?1)' : '?2';
  return db
    .prepare(
      `INSERT INTO song_logs (room_id, song_id, actor_id, actor_name, action, detail, created_at)
       VALUES (?1, ${songIdExpr}, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(roomId, songId, actor.id, actor.displayName, action, JSON.stringify(rest), Math.floor(Date.now() / 1000));
}
