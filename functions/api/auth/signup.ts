import { hashPassword } from '../../_lib/crypto';
import { isUniqueViolation } from '../../_lib/db';
import { HttpError, json, readJson } from '../../_lib/http';
import { createSession, sessionCookie } from '../../_lib/session';
import type { Handler } from '../../_lib/types';
import { validateDisplayName, validatePassword, validateUsername } from '../../_lib/validate';

export const onRequestPost: Handler = async ({ request, env }) => {
  const body = await readJson(request);
  const username = validateUsername(body.username);
  const password = validatePassword(body.password);
  const displayName = validateDisplayName(body.displayName);

  const { hash, salt } = await hashPassword(password);
  let userId: number;
  try {
    const row = await env.DB.prepare(
      `INSERT INTO users (username, display_name, password_hash, salt, created_at)
       VALUES (?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(username, displayName, hash, salt, Math.floor(Date.now() / 1000))
      .first<{ id: number }>();
    userId = row!.id;
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, '이미 사용 중인 아이디입니다.');
    throw err;
  }

  const token = await createSession(env.DB, userId);
  return json(
    { user: { id: userId, username, displayName } },
    { status: 201, headers: { 'Set-Cookie': sessionCookie(request, token) } },
  );
};
