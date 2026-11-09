import { pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  dummyVerify,
  fromHex,
  hashPassword,
  HASH_BYTES,
  pbkdf2,
  PBKDF2_ITERATIONS,
  randomToken,
  SALT_BYTES,
  sha256Hex,
  timingSafeEqual,
  toHex,
  verifyPassword,
} from './crypto';

describe('hashPassword / verifyPassword', () => {
  it('16바이트 salt, 32바이트 해시를 hex로 만든다', async () => {
    const { hash, salt } = await hashPassword('correct horse');
    expect(salt).toMatch(/^[0-9a-f]+$/);
    expect(fromHex(salt)).toHaveLength(SALT_BYTES);
    expect(fromHex(hash)).toHaveLength(HASH_BYTES);
  });

  it('올바른 비밀번호는 통과, 틀린 비밀번호는 실패', async () => {
    const { hash, salt } = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', hash, salt)).toBe(true);
    expect(await verifyPassword('correct horsf', hash, salt)).toBe(false);
    expect(await verifyPassword('', hash, salt)).toBe(false);
  });

  it('같은 비밀번호도 salt가 매번 달라 해시가 다르다', async () => {
    const a = await hashPassword('same password');
    const b = await hashPassword('same password');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('해시에 원본 비밀번호가 드러나지 않는다', async () => {
    const pw = 'plaintext-pw';
    const { hash, salt } = await hashPassword(pw);
    expect(hash).not.toContain(pw);
    expect(salt).not.toContain(pw);
  });

  it('한글·이모지 비밀번호도 동작한다', async () => {
    const { hash, salt } = await hashPassword('합주하자🎸1234');
    expect(await verifyPassword('합주하자🎸1234', hash, salt)).toBe(true);
  });

  it('손상된 hex는 예외 없이 false', async () => {
    expect(await verifyPassword('pw', 'zz', 'not-hex')).toBe(false);
  });

  it('Node의 독립 구현(pbkdf2Sync, SHA-256, 100,000회, 32바이트)과 결과가 같다', async () => {
    const salt = fromHex('00112233445566778899aabbccddeeff');
    const expected = pbkdf2Sync('합주 password', salt, PBKDF2_ITERATIONS, HASH_BYTES, 'sha256');
    expect(PBKDF2_ITERATIONS).toBe(100_000);
    expect(toHex(await pbkdf2('합주 password', salt))).toBe(expected.toString('hex'));
  });

  it('dummyVerify는 항상 false', async () => {
    expect(await dummyVerify('anything')).toBe(false);
  });
});

describe('timingSafeEqual', () => {
  it('같은 내용이면 true, 다르면 false', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
  });
  it('길이가 다르면 false', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe('토큰', () => {
  it('32바이트 랜덤 토큰을 base64url로 만든다', () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(t);
  });
  it('sha256Hex', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
