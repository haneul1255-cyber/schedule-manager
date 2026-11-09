import { json } from '../../_lib/http';
import { clearSessionCookie, deleteSession } from '../../_lib/session';
import type { Handler } from '../../_lib/types';

export const onRequestPost: Handler = async ({ request, env }) => {
  await deleteSession(env.DB, request);
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(request) } });
};
