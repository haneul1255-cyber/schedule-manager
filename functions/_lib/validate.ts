import { HttpError } from './http';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const PASSWORD_MIN = 8;
/** 지나치게 긴 입력으로 해싱 비용을 늘리는 것을 막기 위한 상한 */
export const PASSWORD_MAX = 200;
export const DISPLAY_NAME_MAX = 20;

const charLength = (s: string) => [...s].length;

/** 아이디는 앞뒤 공백 제거 + 소문자로 정규화한 뒤 검사한다. */
export function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateUsername(value: unknown): string {
  const username = normalizeUsername(value);
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, '아이디는 영문 소문자·숫자·밑줄(_) 3~20자여야 합니다.');
  }
  return username;
}

export function validatePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN) {
    throw new HttpError(400, `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`);
  }
  if (value.length > PASSWORD_MAX) {
    throw new HttpError(400, `비밀번호는 ${PASSWORD_MAX}자 이하여야 합니다.`);
  }
  return value;
}

export function validateDisplayName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (charLength(name) < 1 || charLength(name) > DISPLAY_NAME_MAX) {
    throw new HttpError(400, `표시 이름은 1~${DISPLAY_NAME_MAX}자여야 합니다.`);
  }
  return name;
}
