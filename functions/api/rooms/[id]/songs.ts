import { roomAccess } from '../../../_lib/access';
import { HttpError, json, readJson } from '../../../_lib/http';
import { logStatement, resolveRoomMembers } from '../../../_lib/songs';
import type { Handler } from '../../../_lib/types';
import { SONGS_PER_ROOM_MAX, validateMemberIds, validateSongTitle } from '../../../_lib/validate';

/** 곡 추가 (방 멤버 누구나). { title, memberIds[] } */
export const onRequestPost: Handler<'id'> = async ({ request, env, data }) => {
  const { roomId } = roomAccess(data);
  const body = await readJson(request);
  const title = validateSongTitle(body.title);
  const memberIds = validateMemberIds(body.memberIds ?? []);
  const members = await resolveRoomMembers(env.DB, roomId, memberIds);

  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM songs WHERE room_id = ?').bind(roomId).first<{ n: number }>();
  if ((count?.n ?? 0) >= SONGS_PER_ROOM_MAX) throw new HttpError(400, `곡은 방마다 ${SONGS_PER_ROOM_MAX}개까지 만들 수 있습니다.`);

  // 하나의 트랜잭션: 곡 → 멤버 → 로그. 새 곡 ID는 같은 트랜잭션 안의 MAX(id)로 참조한다.
  const newSongId = '(SELECT MAX(id) FROM songs WHERE room_id = ?)';
  const results = await env.DB.batch([
    env.DB.prepare('INSERT INTO songs (room_id, title) VALUES (?, ?)').bind(roomId, title),
    env.DB.prepare(
      `INSERT INTO song_members (song_id, user_id) SELECT ${newSongId}, value FROM json_each(?)`,
    ).bind(roomId, JSON.stringify(memberIds)),
    logStatement(env.DB, roomId, null, data.user!, { action: 'create', after: { title, members } }),
    env.DB.prepare(`SELECT ${newSongId} AS id`).bind(roomId),
  ]);
  const id = (results[3].results as { id: number }[])[0].id;
  return json({ song: { id, title, memberIds: [...memberIds].sort((a, b) => a - b) } }, { status: 201 });
};
