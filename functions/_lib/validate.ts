import { isValidDate } from '../../src/lib/dates';
import { isValidSlots, SLOT_MINUTES } from '../../src/lib/slots';
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

// ---- 방 ----


export const ROOM_NAME_MAX = 50;
export const ROOM_DATES_MAX = 31;

export function validateRoomName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (charLength(name) < 1 || charLength(name) > ROOM_NAME_MAX) {
    throw new HttpError(400, `방 이름은 1~${ROOM_NAME_MAX}자여야 합니다.`);
  }
  return name;
}

/** 중복 제거 + 오름차순 정렬된 날짜 목록 */
export function validateDates(value: unknown): string[] {
  if (!Array.isArray(value)) throw new HttpError(400, '날짜 목록이 필요합니다.');
  for (const d of value) {
    if (typeof d !== 'string' || !isValidDate(d)) throw new HttpError(400, '잘못된 날짜가 있습니다.');
  }
  const dates = [...new Set(value as string[])].sort();
  if (dates.length < 1 || dates.length > ROOM_DATES_MAX) {
    throw new HttpError(400, `날짜는 1~${ROOM_DATES_MAX}개 선택해야 합니다.`);
  }
  return dates;
}

export function validateTimeRange(dayStart: unknown, dayEnd: unknown): { dayStart: number; dayEnd: number } {
  const ok = (v: unknown): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1440 && v % SLOT_MINUTES === 0;
  if (!ok(dayStart) || !ok(dayEnd)) {
    throw new HttpError(400, '시간은 00:00~24:00 사이 30분 단위여야 합니다.');
  }
  if (dayStart >= dayEnd) throw new HttpError(400, '시작 시간은 끝 시간보다 앞이어야 합니다.');
  return { dayStart, dayEnd };
}

export function validateUserId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new HttpError(400, '잘못된 사용자 ID입니다.');
  }
  return value;
}

export function validateInviteCode(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    throw new HttpError(404, '유효하지 않은 초대 링크입니다.');
  }
  return value;
}

// ---- 가능 시간 ----

/**
 * PUT /availability 본문 { [date]: slots } 검증.
 * 날짜는 방의 날짜여야 하고, 문자열은 슬롯 수와 같은 길이의 0/1이어야 한다.
 */
export function validateAvailability(
  body: Record<string, unknown>,
  roomDates: readonly string[],
  slotsPerDay: number,
): [string, string][] {
  const entries = Object.entries(body);
  if (entries.length === 0) throw new HttpError(400, '저장할 날짜가 없습니다.');
  const allowed = new Set(roomDates);
  for (const [date, slots] of entries) {
    if (!allowed.has(date)) throw new HttpError(400, `방에 없는 날짜입니다: ${date.slice(0, 20)}`);
    if (!isValidSlots(slots, slotsPerDay)) {
      throw new HttpError(400, `가능 시간 형식이 올바르지 않습니다 (${date}). 새로고침 후 다시 시도해 주세요.`);
    }
  }
  return entries as [string, string][];
}

// ---- 곡 ----

export const SONG_TITLE_MAX = 50;
export const SONGS_PER_ROOM_MAX = 100;

export function validateSongTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : '';
  if (charLength(title) < 1 || charLength(title) > SONG_TITLE_MAX) {
    throw new HttpError(400, `곡 제목은 1~${SONG_TITLE_MAX}자여야 합니다.`);
  }
  return title;
}

/** 형식만 검사 (중복 제거). 방 멤버인지는 DB에서 확인한다. */
export function validateMemberIds(value: unknown): number[] {
  if (!Array.isArray(value)) throw new HttpError(400, '참여 멤버 목록이 필요합니다.');
  for (const v of value) validateUserId(v);
  return [...new Set(value as number[])];
}
