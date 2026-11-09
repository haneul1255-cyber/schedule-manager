import { requireOwner, roomAccess } from '../../../_lib/access';
import { getRoom, getRoomDates, loadRoomData } from '../../../_lib/db';
import { HttpError, json, readJson } from '../../../_lib/http';
import type { Handler } from '../../../_lib/types';
import { validateDates, validateRoomName, validateTimeRange } from '../../../_lib/validate';
import { remapSlots } from '../../../../src/lib/slots';

/** 방 전체 데이터 */
export const onRequestGet: Handler<'id'> = async ({ env, data }) => {
  const { roomId, role } = roomAccess(data);
  const room = await loadRoomData(env.DB, roomId);
  if (!room) throw new HttpError(403, '방이 없거나 접근 권한이 없습니다.');
  return json({ ...room, me: { id: data.user!.id, role } });
};

/**
 * 방 설정 수정 (방장만). { name?, dates?, dayStart?, dayEnd? }
 * - 빠진 날짜의 가능 시간은 삭제
 * - 시간 범위가 바뀌면 겹치는 시간의 입력은 유지하고 범위 밖 입력만 버린다
 */
export const onRequestPatch: Handler<'id'> = async ({ request, env, data }) => {
  const { roomId } = requireOwner(data);
  const body = await readJson(request);
  const db = env.DB;
  const cur = await getRoom(db, roomId);
  if (!cur) throw new HttpError(403, '방이 없거나 접근 권한이 없습니다.');

  const name = body.name !== undefined ? validateRoomName(body.name) : cur.name;
  const { dayStart, dayEnd } = validateTimeRange(body.dayStart ?? cur.day_start, body.dayEnd ?? cur.day_end);
  const curDates = await getRoomDates(db, roomId);
  const dates = body.dates !== undefined ? validateDates(body.dates) : curDates;

  const removed = curDates.filter((d) => !dates.includes(d));
  const added = dates.filter((d) => !curDates.includes(d));
  const stmts: D1PreparedStatement[] = [
    db.prepare('UPDATE rooms SET name = ?, day_start = ?, day_end = ? WHERE id = ?').bind(name, dayStart, dayEnd, roomId),
  ];
  for (const d of removed) {
    stmts.push(db.prepare('DELETE FROM room_dates WHERE room_id = ? AND date = ?').bind(roomId, d));
    stmts.push(db.prepare('DELETE FROM availability WHERE room_id = ? AND date = ?').bind(roomId, d));
  }
  for (const d of added) {
    stmts.push(db.prepare('INSERT INTO room_dates (room_id, date) VALUES (?, ?)').bind(roomId, d));
  }
  if (dayStart !== cur.day_start || dayEnd !== cur.day_end) {
    const { results } = await db
      .prepare('SELECT user_id, date, slots FROM availability WHERE room_id = ?')
      .bind(roomId)
      .all<{ user_id: number; date: string; slots: string }>();
    for (const r of results) {
      if (removed.includes(r.date)) continue;
      const slots = remapSlots(r.slots, cur.day_start, dayStart, dayEnd, cur.slot_minutes);
      stmts.push(
        db
          .prepare('UPDATE availability SET slots = ? WHERE room_id = ? AND user_id = ? AND date = ?')
          .bind(slots, roomId, r.user_id, r.date),
      );
    }
  }
  await db.batch(stmts); // D1 batch는 하나의 트랜잭션으로 실행된다

  const room = await loadRoomData(db, roomId);
  return json({ ...room, me: { id: data.user!.id, role: 'owner' } });
};

/** 방 삭제 (방장만). 날짜·멤버·곡은 ON DELETE CASCADE, availability는 FK가 없어 직접 삭제. */
export const onRequestDelete: Handler<'id'> = async ({ env, data }) => {
  const { roomId } = requireOwner(data);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM availability WHERE room_id = ?').bind(roomId),
    env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(roomId),
  ]);
  return json({ ok: true });
};
