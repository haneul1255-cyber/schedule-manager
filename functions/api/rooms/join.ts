import { HttpError, json, readJson, requireUser } from '../../_lib/http';
import type { Handler } from '../../_lib/types';
import { validateInviteCode } from '../../_lib/validate';

/** 초대 코드로 참가. 이미 멤버면 그대로 성공 처리한다. */
export const onRequestPost: Handler = async ({ request, env, data }) => {
  const user = requireUser(data);
  const body = await readJson(request);
  const inviteCode = validateInviteCode(body.inviteCode);

  const room = await env.DB.prepare('SELECT id FROM rooms WHERE invite_code = ?')
    .bind(inviteCode)
    .first<{ id: string }>();
  if (!room) throw new HttpError(404, '유효하지 않은 초대 링크입니다.');

  const res = await env.DB.prepare(
    "INSERT OR IGNORE INTO room_members (room_id, user_id, role) VALUES (?, ?, 'member')",
  )
    .bind(room.id, user.id)
    .run();
  return json({ roomId: room.id, joined: res.meta.changes > 0 });
};
