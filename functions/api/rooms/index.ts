import { randomId } from '../../_lib/crypto';
import { nowSeconds } from '../../_lib/db';
import { json, readJson, requireUser } from '../../_lib/http';
import type { Handler } from '../../_lib/types';
import { validateDates, validateRoomName, validateTimeRange } from '../../_lib/validate';
import { SLOT_MINUTES } from '../../../src/lib/slots';

/** 내가 속한 방 목록 */
export const onRequestGet: Handler = async ({ env, data }) => {
  const user = requireUser(data);
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.name, m.role, r.day_start, r.day_end, r.created_at,
            (SELECT COUNT(*) FROM room_members x WHERE x.room_id = r.id) AS member_count,
            (SELECT COUNT(*) FROM room_dates d WHERE d.room_id = r.id) AS date_count,
            (SELECT MIN(date) FROM room_dates d WHERE d.room_id = r.id) AS first_date,
            (SELECT MAX(date) FROM room_dates d WHERE d.room_id = r.id) AS last_date
       FROM room_members m JOIN rooms r ON r.id = m.room_id
      WHERE m.user_id = ?
      ORDER BY r.created_at DESC`,
  )
    .bind(user.id)
    .all<{
      id: string;
      name: string;
      role: string;
      day_start: number;
      day_end: number;
      created_at: number;
      member_count: number;
      date_count: number;
      first_date: string | null;
      last_date: string | null;
    }>();
  return json({
    rooms: results.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      dayStart: r.day_start,
      dayEnd: r.day_end,
      memberCount: r.member_count,
      dateCount: r.date_count,
      firstDate: r.first_date,
      lastDate: r.last_date,
    })),
  });
};

/** 방 만들기. 만든 사람이 방장이 된다. */
export const onRequestPost: Handler = async ({ request, env, data }) => {
  const user = requireUser(data);
  const body = await readJson(request);
  const name = validateRoomName(body.name);
  const dates = validateDates(body.dates);
  const { dayStart, dayEnd } = validateTimeRange(body.dayStart, body.dayEnd);

  const id = randomId();
  const inviteCode = randomId();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO rooms (id, name, owner_id, invite_code, day_start, day_end, slot_minutes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, name, user.id, inviteCode, dayStart, dayEnd, SLOT_MINUTES, nowSeconds()),
    env.DB.prepare("INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, 'owner')").bind(id, user.id),
    ...dates.map((d) => env.DB.prepare('INSERT INTO room_dates (room_id, date) VALUES (?, ?)').bind(id, d)),
  ]);
  return json({ room: { id } }, { status: 201 });
};
