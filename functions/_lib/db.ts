import type { RoomRole } from './types';

export interface UserRow {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  salt: string;
}

export function findUserByUsername(db: D1Database, username: string): Promise<UserRow | null> {
  return db
    .prepare('SELECT id, username, display_name, password_hash, salt FROM users WHERE username = ?')
    .bind(username)
    .first<UserRow>();
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

export const nowSeconds = () => Math.floor(Date.now() / 1000);

// ---- 방 ----

export interface RoomRow {
  id: string;
  name: string;
  owner_id: number;
  invite_code: string;
  day_start: number;
  day_end: number;
  slot_minutes: number;
  created_at: number;
}

export function getRoom(db: D1Database, roomId: string): Promise<RoomRow | null> {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first<RoomRow>();
}

export async function getRoomDates(db: D1Database, roomId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT date FROM room_dates WHERE room_id = ? ORDER BY date')
    .bind(roomId)
    .all<{ date: string }>();
  return results.map((r) => r.date);
}

export interface RoomData {
  room: {
    id: string;
    name: string;
    ownerId: number;
    inviteCode: string;
    dayStart: number;
    dayEnd: number;
    slotMinutes: number;
    createdAt: number;
  };
  dates: string[];
  members: { id: number; displayName: string; role: RoomRole }[];
  songs: { id: number; title: string; memberIds: number[] }[];
  /** availability[userId][date] = '0101...' */
  availability: Record<string, Record<string, string>>;
}

/** 방 화면에 필요한 전체 데이터를 한 번에 읽는다 (결과 계산은 클라이언트에서). */
export async function loadRoomData(db: D1Database, roomId: string): Promise<RoomData | null> {
  const [roomRes, datesRes, membersRes, songsRes, songMembersRes, availRes] = await db.batch([
    db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId),
    db.prepare('SELECT date FROM room_dates WHERE room_id = ? ORDER BY date').bind(roomId),
    db
      .prepare(
        `SELECT u.id, u.display_name, m.role
           FROM room_members m JOIN users u ON u.id = m.user_id
          WHERE m.room_id = ?
          ORDER BY (m.role = 'owner') DESC, u.display_name`,
      )
      .bind(roomId),
    db.prepare('SELECT id, title FROM songs WHERE room_id = ? ORDER BY id').bind(roomId),
    db
      .prepare(
        `SELECT sm.song_id, sm.user_id FROM song_members sm
           JOIN songs s ON s.id = sm.song_id WHERE s.room_id = ?`,
      )
      .bind(roomId),
    db.prepare('SELECT user_id, date, slots FROM availability WHERE room_id = ?').bind(roomId),
  ]);
  const room = (roomRes.results as RoomRow[])[0];
  if (!room) return null;

  const songMembers = new Map<number, number[]>();
  for (const r of songMembersRes.results as { song_id: number; user_id: number }[]) {
    const list = songMembers.get(r.song_id) ?? [];
    list.push(r.user_id);
    songMembers.set(r.song_id, list);
  }
  const availability: RoomData['availability'] = {};
  for (const r of availRes.results as { user_id: number; date: string; slots: string }[]) {
    (availability[r.user_id] ??= {})[r.date] = r.slots;
  }

  return {
    room: {
      id: room.id,
      name: room.name,
      ownerId: room.owner_id,
      inviteCode: room.invite_code,
      dayStart: room.day_start,
      dayEnd: room.day_end,
      slotMinutes: room.slot_minutes,
      createdAt: room.created_at,
    },
    dates: (datesRes.results as { date: string }[]).map((r) => r.date),
    members: (membersRes.results as { id: number; display_name: string; role: RoomRole }[]).map((m) => ({
      id: m.id,
      displayName: m.display_name,
      role: m.role,
    })),
    songs: (songsRes.results as { id: number; title: string }[]).map((s) => ({
      id: s.id,
      title: s.title,
      memberIds: (songMembers.get(s.id) ?? []).sort((a, b) => a - b),
    })),
    availability,
  };
}

/** 멤버를 방에서 제거하면서 그 사람의 가능 시간과 곡 참여 지정도 지우는 구문들 */
export function removeMemberStatements(db: D1Database, roomId: string, userId: number): D1PreparedStatement[] {
  return [
    db
      .prepare('DELETE FROM song_members WHERE user_id = ? AND song_id IN (SELECT id FROM songs WHERE room_id = ?)')
      .bind(userId, roomId),
    db.prepare('DELETE FROM availability WHERE room_id = ? AND user_id = ?').bind(roomId, userId),
    db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').bind(roomId, userId),
  ];
}
