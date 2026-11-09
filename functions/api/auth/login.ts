import { dummyVerify, verifyPassword } from '../../_lib/crypto';
import { findUserByUsername } from '../../_lib/db';
import { HttpError, json, readJson } from '../../_lib/http';
import { createSession, sessionCookie } from '../../_lib/session';
import type { Handler } from '../../_lib/types';
import { normalizeUsername, PASSWORD_MAX } from '../../_lib/validate';

const LOGIN_FAILED = '아이디 또는 비밀번호가 올바르지 않습니다.';

export const onRequestPost: Handler = async ({ request, env }) => {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password || password.length > PASSWORD_MAX) {
    throw new HttpError(401, LOGIN_FAILED);
  }

  const user = await findUserByUsername(env.DB, username);
  // 아이디가 없어도 같은 비용의 해싱을 수행해 응답 시간 차이를 없앤다.
  const ok = user
    ? await verifyPassword(password, user.password_hash, user.salt)
    : await dummyVerify(password);
  if (!user || !ok) throw new HttpError(401, LOGIN_FAILED);

  const token = await createSession(env.DB, user.id);
  return json(
    { user: { id: user.id, username: user.username, displayName: user.display_name } },
    { headers: { 'Set-Cookie': sessionCookie(request, token) } },
  );
};
