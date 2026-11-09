import { roomAccess } from '../../../_lib/access';
import { getRoom, getRoomDates } from '../../../_lib/db';
import { HttpError, json, readJson } from '../../../_lib/http';
import type { Handler } from '../../../_lib/types';
import { validateAvailability } from '../../../_lib/validate';
import { slotCount } from '../../../../src/lib/slots';

/** 내 가능 시간 저장. 본문 { [date]: '0101...' } — 보낸 날짜만 덮어쓴다. user_id는 항상 세션 사용자. */
export const onRequestPut: Handler<'id'> = async ({ request, env, data }) => {
  const { roomId } = roomAccess(data);
  const userId = data.user!.id;
  const body = await readJson(request);

  const [room, dates] = await Promise.all([getRoom(env.DB, roomId), getRoomDates(env.DB, roomId)]);
  if (!room) throw new HttpError(403, '방이 없거나 접근 권한이 없습니다.');
  const entries = validateAvailability(body, dates, slotCount(room.day_start, room.day_end, room.slot_minutes));

  await env.DB.batch(
    entries.map(([date, slots]) =>
      env.DB.prepare(
        `INSERT INTO availability (room_id, user_id, date, slots) VALUES (?, ?, ?, ?)
         ON CONFLICT (room_id, user_id, date) DO UPDATE SET slots = excluded.slots`,
      ).bind(roomId, userId, date, slots),
    ),
  );
  return json({ ok: true });
};
