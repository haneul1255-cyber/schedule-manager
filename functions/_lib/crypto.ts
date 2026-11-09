// 비밀번호 해싱과 토큰 생성. Web Crypto(crypto.subtle)만 사용한다.

/** Cloudflare Workers의 PBKDF2 반복 횟수 상한. 이보다 크게 하면 Workers에서 실패한다. */
export const PBKDF2_ITERATIONS = 100_000;
export const SALT_BYTES = 16;
export const HASH_BYTES = 32;
export const TOKEN_BYTES = 32;

const encoder = new TextEncoder();

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) throw new Error('invalid hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 길이가 같으면 내용과 무관하게 항상 전체를 비교한다. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** 새 랜덤 salt로 해싱. 결과는 DB에 넣을 hex 문자열. */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await pbkdf2(password, salt);
  return { hash: toHex(hash), salt: toHex(salt) };
}

export async function verifyPassword(password: string, hashHex: string, saltHex: string): Promise<boolean> {
  let expected: Uint8Array;
  let salt: Uint8Array<ArrayBuffer>;
  try {
    expected = fromHex(hashHex);
    salt = fromHex(saltHex);
  } catch {
    return false;
  }
  const actual = await pbkdf2(password, salt);
  return timingSafeEqual(actual, expected);
}

/**
 * 존재하지 않는 아이디로 로그인할 때도 같은 시간을 쓰도록 하는 더미 검증.
 * 응답 시간으로 아이디 존재 여부를 알아내지 못하게 한다.
 */
const DUMMY_SALT = new Uint8Array(SALT_BYTES);
export async function dummyVerify(password: string): Promise<false> {
  await pbkdf2(password, DUMMY_SALT);
  return false;
}

/** 세션 토큰 (쿠키에 들어가는 원본). */
export function randomToken(): string {
  return toBase64Url(randomBytes(TOKEN_BYTES));
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return toHex(new Uint8Array(digest));
}

/** 방 ID·초대 코드용 추측 불가능한 랜덤 문자열 (12바이트 = 96비트, base64url 16자) */
export function randomId(bytes = 12): string {
  return toBase64Url(randomBytes(bytes));
}
