import { describe, expect, it } from 'vitest';
import { verifyPassword } from '../functions/_lib/crypto';
import { buildResetSql, hashPassword } from './reset-password.mjs';

describe('reset-password 스크립트', () => {
  it('스크립트로 만든 해시를 서버의 verifyPassword가 검증한다 (알고리즘·파라미터 일치)', async () => {
    const { hash, salt } = await hashPassword('새비밀번호1234');
    expect(salt).toHaveLength(32); // 16바이트
    expect(hash).toHaveLength(64); // 32바이트
    expect(await verifyPassword('새비밀번호1234', hash, salt)).toBe(true);
    expect(await verifyPassword('다른비밀번호', hash, salt)).toBe(false);
  });

  it('SQL: 해시 갱신 + 세션 삭제, 원본 비밀번호는 포함하지 않음', async () => {
    const h = await hashPassword('plain-password');
    const sql = buildResetSql('haneul', h);
    expect(sql).toContain(`password_hash = '${h.hash}'`);
    expect(sql).toContain('DELETE FROM sessions');
    expect(sql).not.toContain('plain-password');
  });

  it("아이디 형식이 틀리면 거부 (SQL 주입 방지)", () => {
    expect(() => buildResetSql("x' OR '1'='1", { hash: 'ab', salt: 'cd' })).toThrow();
  });
});
