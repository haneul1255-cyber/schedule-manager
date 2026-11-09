import { requireOwner } from '../../../../_lib/access';
import { removeMemberStatements } from '../../../../_lib/db';
import { HttpError, json } from '../../../../_lib/http';
import type { Handler } from '../../../../_lib/types';

/** 멤버 내보내기 (방장만). 그 사람의 가능 시간과 곡 참여 지정도 삭제된다. */
export const onRequestDelete: Handler<'id' | 'userId'> = async ({ env, data, params }) => {
  const { roomId } = requireOwner(data);
  const targetId = Number(params.userId);
  if (!Number.isSafeInteger(targetId) || targetId <= 0) throw new HttpError(400, '잘못된 사용자 ID입니다.');
  if (targetId === data.user!.id) throw new HttpError(400, '자기 자신은 내보낼 수 없습니다.');

  const target = await env.DB.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?')
    .bind(roomId, targetId)
    .first();
  if (!target) throw new HttpError(404, '이 방의 멤버가 아닙니다.');

  await env.DB.batch(removeMemberStatements(env.DB, roomId, targetId));
  return json({ ok: true });
};
