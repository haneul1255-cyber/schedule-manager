import { randomToken, sha256Hex } from './crypto';
import type { SessionUser } from './types';

export const SESSION_COOKIE = 'session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * 로컬 개발(http://localhost)에서는 Secure 쿠키를 저장하지 않는 브라우저(Safari 등)가 있어
 * Secure를 뺀다. 배포 환경은 항상 https이므로 Secure가 붙는다.
 */
function isLocalHttp(request: Request): boolean {
  const url = new URL(request.url);
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

function cookieAttrs(request: Request, maxAge: number): string {
  const attrs = ['HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${maxAge}`];
  if (!isLocalHttp(request)) attrs.push('Secure');
  return attrs.join('; ');
}

export function sessionCookie(request: Request, token: string): string {
  return `${SESSION_COOKIE}=${token}; ${cookieAttrs(request, SESSION_TTL_SECONDS)}`;
}

export function clearSessionCookie(request: Request): string {
  return `${SESSION_COOKIE}=; ${cookieAttrs(request, 0)}`;
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) {
      const value = rest.join('=');
      return value || null;
    }
  }
  return null;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** 세션을 만들고 쿠키에 넣을 원본 토큰을 반환한다. DB에는 해시만 저장. */
export async function createSession(db: D1Database, userId: number): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = nowSeconds();
  await db.batch([
    // 만료된 세션 정리 (소규모 서비스라 로그인 때 같이 처리)
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db
      .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(tokenHash, userId, now + SESSION_TTL_SECONDS),
  ]);
  return token;
}

export async function getSessionUser(db: D1Database, request: Request): Promise<SessionUser | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.display_name
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, nowSeconds())
    .first<{ id: number; username: string; display_name: string }>();
  if (!row) return null;
  return { id: row.id, username: row.username, displayName: row.display_name };
}

export async function deleteSession(db: D1Database, request: Request): Promise<void> {
  const token = readSessionToken(request);
  if (!token) return;
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
}
