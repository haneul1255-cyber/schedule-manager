import { requireRoomMember } from '../../../_lib/access';
import { HttpError, requireUser } from '../../../_lib/http';
import type { Handler } from '../../../_lib/types';

const NO_ACCESS = '곡이 없거나 접근 권한이 없습니다.';

/**
 * /api/songs/:songId/** 의 모든 요청: 곡이 속한 방의 멤버인지 확인한다.
 * 곡이 없을 때도 같은 403을 돌려 존재 여부가 드러나지 않게 한다.
 */
export const onRequest: Handler<'songId'> = async (ctx) => {
  const user = requireUser(ctx.data);
  const songId = Number(ctx.params.songId);
  if (!Number.isSafeInteger(songId) || songId <= 0) throw new HttpError(403, NO_ACCESS);
  const song = await ctx.env.DB.prepare('SELECT room_id FROM songs WHERE id = ?').bind(songId).first<{ room_id: string }>();
  if (!song) throw new HttpError(403, NO_ACCESS);
  ctx.data.room = await requireRoomMember(ctx.env.DB, song.room_id, user.id);
  ctx.data.songId = songId;
  return ctx.next();
};
