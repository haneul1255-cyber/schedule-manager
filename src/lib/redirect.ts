/**
 * 로그인 후 돌아갈 경로. 외부 사이트로의 리다이렉트(open redirect)를 막기 위해
 * 같은 사이트의 절대 경로(`/...`)만 허용한다.
 */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  return next;
}
