import { describe, expect, it } from 'vitest';
import { clearSessionCookie, isLocalDevHost, readSessionToken, sessionCookie } from './session';

describe('isLocalDevHost', () => {
  it.each(['localhost', '127.0.0.1', '[::1]', '192.168.0.12', '10.0.0.5', '172.16.1.1', '172.31.255.1', 'macbook.local'])(
    '로컬: %s',
    (h) => expect(isLocalDevHost(h)).toBe(true),
  );
  it.each(['band.pages.dev', 'example.com', '172.32.0.1', '8.8.8.8', '192.169.0.1', 'localhost.evil.com'])(
    '로컬 아님: %s',
    (h) => expect(isLocalDevHost(h)).toBe(false),
  );
});

describe('세션 쿠키', () => {
  const req = (url: string) => new Request(url);
  it('배포(https)에서는 Secure + HttpOnly + SameSite=Lax + Path=/', () => {
    const c = sessionCookie(req('https://band.pages.dev/api/auth/login'), 'tok');
    expect(c).toMatch(/^session=tok;/);
    for (const a of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=2592000']) expect(c).toContain(a);
  });
  it('공개 도메인은 http여도 Secure 유지', () => {
    expect(sessionCookie(req('http://band.example.com/'), 'tok')).toContain('Secure');
  });
  it('로컬·사설 IP의 http에서는 Secure 생략', () => {
    expect(sessionCookie(req('http://localhost:5173/'), 'tok')).not.toContain('Secure');
    expect(sessionCookie(req('http://192.168.0.12:5173/'), 'tok')).not.toContain('Secure');
  });
  it('로그아웃 쿠키는 Max-Age=0', () => {
    expect(clearSessionCookie(req('https://band.pages.dev/'))).toContain('Max-Age=0');
  });
  it('쿠키 헤더에서 토큰 읽기', () => {
    const r = new Request('https://x/', { headers: { Cookie: 'a=1; session=abc-_d; b=2' } });
    expect(readSessionToken(r)).toBe('abc-_d');
    expect(readSessionToken(new Request('https://x/'))).toBeNull();
  });
});
