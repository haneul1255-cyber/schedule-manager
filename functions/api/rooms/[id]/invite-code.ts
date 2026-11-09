import { requireOwner } from '../../../_lib/access';
import { randomId } from '../../../_lib/crypto';
import { json } from '../../../_lib/http';
import type { Handler } from '../../../_lib/types';

/**
 * 초대 코드 재발급 (방장만). 기존 링크는 더 이상 동작하지 않는다.
 * 내보낸 멤버가 예전 링크로 다시 들어오는 것을 막을 때 사용.
 */
export const onRequestPost: Handler<'id'> = async ({ env, data }) => {
  const { roomId } = requireOwner(data);
  const inviteCode = randomId();
  await env.DB.prepare('UPDATE rooms SET invite_code = ? WHERE id = ?').bind(inviteCode, roomId).run();
  return json({ inviteCode });
};
