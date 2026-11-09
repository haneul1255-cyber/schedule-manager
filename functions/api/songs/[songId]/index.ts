import { roomAccess } from '../../../_lib/access';
import { HttpError, json, readJson } from '../../../_lib/http';
import { logStatement, resolveRoomMembers, songSnapshot } from '../../../_lib/songs';
import type { Data, Handler } from '../../../_lib/types';
import { validateMemberIds, validateSongTitle } from '../../../_lib/validate';

function songIdOf(data: Data): number {
  if (typeof data.songId !== 'number') throw new Error('song middleware missing');
  return data.songId;
}

/** 곡 수정 (방 멤버 누구나). { title?, memberIds? } */
export const onRequestPatch: Handler<'songId'> = async ({ request, env, data }) => {
  const { roomId } = roomAccess(data);
  const songId = songIdOf(data);
  const body = await readJson(request);
  if (body.title === undefined && body.memberIds === undefined) {
    throw new HttpError(400, '수정할 내용이 없습니다.');
  }
  const before = await songSnapshot(env.DB, songId);
  if (!before) throw new HttpError(403, '곡이 없거나 접근 권한이 없습니다.');

  const title = body.title !== undefined ? validateSongTitle(body.title) : before.title;
  const memberIds = body.memberIds !== undefined ? validateMemberIds(body.memberIds) : before.members.map((m) => m.id);
  const members = await resolveRoomMembers(env.DB, roomId, memberIds);

  const changed =
    title !== before.title ||
    JSON.stringify([...memberIds].sort()) !== JSON.stringify(before.members.map((m) => m.id).sort());
  if (changed) {
    await env.DB.batch([
      env.DB.prepare('UPDATE songs SET title = ? WHERE id = ?').bind(title, songId),
      env.DB.prepare('DELETE FROM song_members WHERE song_id = ?').bind(songId),
      env.DB.prepare('INSERT INTO song_members (song_id, user_id) SELECT ?, value FROM json_each(?)').bind(
        songId,
        JSON.stringify(memberIds),
      ),
      logStatement(env.DB, roomId, songId, data.user!, { action: 'update', before, after: { title, members } }),
    ]);
  }
  return json({ song: { id: songId, title, memberIds: [...memberIds].sort((a, b) => a - b) } });
};

/** 곡 삭제 (방 멤버 누구나). 기록은 방장이 song-logs에서 확인. */
export const onRequestDelete: Handler<'songId'> = async ({ env, data }) => {
  const { roomId } = roomAccess(data);
  const songId = songIdOf(data);
  const before = await songSnapshot(env.DB, songId);
  if (!before) throw new HttpError(403, '곡이 없거나 접근 권한이 없습니다.');
  await env.DB.batch([
    logStatement(env.DB, roomId, songId, data.user!, { action: 'delete', before }),
    env.DB.prepare('DELETE FROM songs WHERE id = ?').bind(songId), // song_members는 CASCADE
  ]);
  return json({ ok: true });
};
