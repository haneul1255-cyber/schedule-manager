import { roomAccess } from '../../../_lib/access';
import { removeMemberStatements } from '../../../_lib/db';
import { HttpError, json } from '../../../_lib/http';
import type { Handler } from '../../../_lib/types';

/** 방 나가기. 내 가능 시간과 곡 참여 지정도 삭제된다. 방장은 먼저 방장을 넘겨야 한다. */
export const onRequestPost: Handler<'id'> = async ({ env, data }) => {
  const { roomId, role } = roomAccess(data);
  if (role === 'owner') {
    throw new HttpError(400, '방장은 방을 나갈 수 없습니다. 다른 멤버에게 방장을 넘긴 뒤 나가 주세요.');
  }
  await env.DB.batch(removeMemberStatements(env.DB, roomId, data.user!.id));
  return json({ ok: true });
};
