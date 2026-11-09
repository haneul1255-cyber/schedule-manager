#!/usr/bin/env node
// 비밀번호 초기화용 SQL 생성기.
//   node scripts/reset-password.mjs <아이디>
// 새 비밀번호를 (화면에 표시하지 않고) 두 번 입력받아, 서버와 같은 방식
// (PBKDF2-SHA256, 100,000회, 16바이트 salt, 32바이트 출력, hex)으로 해싱한 뒤
// D1 콘솔에 붙여 넣을 SQL을 출력한다. 원본 비밀번호는 출력하거나 저장하지 않는다.
import { webcrypto } from 'node:crypto';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

// functions/_lib/crypto.ts 와 반드시 같은 값이어야 한다 (테스트로 확인)
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

const toHex = (bytes) => Buffer.from(bytes).toString('hex');

export async function hashPassword(password, salt = webcrypto.getRandomValues(new Uint8Array(SALT_BYTES))) {
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    HASH_BYTES * 8,
  );
  return { hash: toHex(new Uint8Array(bits)), salt: toHex(salt) };
}

/** 아이디는 정규식으로 검증하므로 SQL에 그대로 넣어도 안전하다. 해시·salt는 hex. */
export function buildResetSql(username, { hash, salt }) {
  if (!USERNAME_RE.test(username)) throw new Error('아이디 형식이 올바르지 않습니다.');
  if (!/^[0-9a-f]+$/.test(hash) || !/^[0-9a-f]+$/.test(salt)) throw new Error('잘못된 해시');
  return [
    `UPDATE users SET password_hash = '${hash}', salt = '${salt}' WHERE username = '${username}';`,
    `DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = '${username}');`,
  ].join('\n');
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      // 질문 문구만 출력하고 입력한 글자는 숨긴다
      if (s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const username = (process.argv[2] ?? '').trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    console.error('사용법: node scripts/reset-password.mjs <아이디>   (영문 소문자·숫자·밑줄 3~20자)');
    process.exit(1);
  }
  const pw1 = await askHidden(`'${username}'의 새 비밀번호: `);
  if (pw1.length < PASSWORD_MIN || pw1.length > PASSWORD_MAX) {
    console.error(`비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 합니다.`);
    process.exit(1);
  }
  const pw2 = await askHidden('한 번 더 입력: ');
  if (pw1 !== pw2) {
    console.error('두 비밀번호가 다릅니다.');
    process.exit(1);
  }
  const sql = buildResetSql(username, await hashPassword(pw1));
  console.log('\n아래 SQL을 D1 콘솔(또는 wrangler d1 execute)에서 실행하세요. 해당 사용자는 모든 기기에서 로그아웃됩니다.\n');
  console.log(sql);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
