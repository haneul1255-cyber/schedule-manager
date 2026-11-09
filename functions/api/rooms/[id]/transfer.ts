import { requireOwner } from '../../../_lib/access';
import { HttpError, json, readJson } from '../../../_lib/http';
import type { Handler } from '../../../_lib/types';
import { validateUserId } from '../../../_lib/validate';

/** 방장 넘기기 (방장만). { userId } — 대상은 이 방의 멤버여야 한다. */
export const onRequestPost: Handler<'id'> = async ({ request, env, data }) => {
  const { roomId } = requireOwner(data);
  const body = await readJson(request);
  const targetId = validateUserId(body.userId);
  const me = data.user!.id;
  if (targetId === me) throw new HttpError(400, '이미 방장입니다.');

  const target = await env.DB.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?')
    .bind(roomId, targetId)
    .first();
  if (!target) throw new HttpError(400, '이 방의 멤버에게만 방장을 넘길 수 있습니다.');

  await env.DB.batch([
    env.DB.prepare('UPDATE rooms SET owner_id = ? WHERE id = ?').bind(targetId, roomId),
    env.DB.prepare("UPDATE room_members SET role = 'member' WHERE room_id = ? AND user_id = ?").bind(roomId, me),
    env.DB.prepare("UPDATE room_members SET role = 'owner' WHERE room_id = ? AND user_id = ?").bind(roomId, targetId),
  ]);
  return json({ ok: true });
};
