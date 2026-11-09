// 슬롯 관련 순수 함수. 서버(functions)와 클라이언트가 함께 사용한다.
// 그리드는 grid[dateIndex][slotIndex] = 가능 여부 형태의 boolean 2차원 배열이다.

export const SLOT_MINUTES = 30;

/** 하루 시작~끝(분) 사이의 슬롯 개수 */
export function slotCount(dayStart: number, dayEnd: number, slotMinutes = SLOT_MINUTES): number {
  return Math.floor((dayEnd - dayStart) / slotMinutes);
}

// ---- 슬롯 문자열 ↔ boolean 배열 ----

/** '0110' → [false, true, true, false]. length를 주면 모자란 부분은 false로 채우고 넘치는 부분은 자른다. */
export function slotsToBools(slots: string, length = slots.length): boolean[] {
  return Array.from({ length }, (_, i) => slots[i] === '1');
}

export function boolsToSlots(bools: readonly boolean[]): string {
  return bools.map((b) => (b ? '1' : '0')).join('');
}

export function isValidSlots(slots: unknown, length: number): slots is string {
  return typeof slots === 'string' && slots.length === length && /^[01]*$/.test(slots);
}

// ---- 시간 표기 ----

/** 자정부터의 분 → "HH:MM" (1440 → "24:00") */
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "HH:MM" → 자정부터의 분. 형식이 틀리면 NaN. */
export function hhmmToMinutes(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min >= 60 || h * 60 + min > 1440) return NaN;
  return h * 60 + min;
}

/** 슬롯 인덱스 → 그 슬롯의 시작 시각 "HH:MM" */
export function slotIndexToHHMM(index: number, dayStart: number, slotMinutes = SLOT_MINUTES): string {
  return minutesToHHMM(dayStart + index * slotMinutes);
}

/** "HH:MM" → 그 시각에 시작하는 슬롯 인덱스. 슬롯 경계가 아니면 -1. */
export function hhmmToSlotIndex(hhmm: string, dayStart: number, slotMinutes = SLOT_MINUTES): number {
  const minutes = hhmmToMinutes(hhmm);
  const idx = (minutes - dayStart) / slotMinutes;
  return Number.isInteger(idx) && idx >= 0 ? idx : -1;
}

// ---- 방 설정 변경 ----

/**
 * 방의 시간 범위가 바뀔 때 기존 슬롯 문자열을 새 범위로 옮긴다.
 * 겹치는 시간의 입력은 유지하고, 새 범위에서 새로 생긴 시간은 '0', 범위 밖 입력은 버린다.
 */
export function remapSlots(
  slots: string,
  oldStart: number,
  newStart: number,
  newEnd: number,
  slotMinutes = SLOT_MINUTES,
): string {
  const n = slotCount(newStart, newEnd, slotMinutes);
  let out = '';
  for (let i = 0; i < n; i++) {
    const j = (newStart + i * slotMinutes - oldStart) / slotMinutes;
    out += Number.isInteger(j) && j >= 0 && j < slots.length ? slots[j] : '0';
  }
  return out;
}

// ---- 그리드 ----

export type Grid = boolean[][];

/** 내 availability(날짜→문자열)를 그리드로. 입력이 없는 날짜는 전부 false. */
export function gridFromAvailability(
  dates: readonly string[],
  availability: Readonly<Record<string, string>> | undefined,
  slotsPerDay: number,
): Grid {
  return dates.map((d) => slotsToBools(availability?.[d] ?? '', slotsPerDay));
}

/** 그리드 → PUT /availability 본문 */
export function gridToAvailability(dates: readonly string[], grid: Grid): Record<string, string> {
  const out: Record<string, string> = {};
  dates.forEach((d, i) => (out[d] = boolsToSlots(grid[i])));
  return out;
}

export interface Cell {
  /** 날짜 인덱스 (가로) */
  col: number;
  /** 슬롯 인덱스 (세로) */
  row: number;
}

/**
 * when2meet식 직사각형 선택: 두 셀을 꼭짓점으로 하는 직사각형 안의 모든 칸을 value로 바꾼 새 그리드.
 * 원본은 변경하지 않는다. 그리드 밖 좌표는 경계로 잘린다.
 */
export function applyRect(grid: Grid, a: Cell, b: Cell, value: boolean): Grid {
  if (grid.length === 0) return grid;
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
  const c0 = clamp(Math.min(a.col, b.col), grid.length - 1);
  const c1 = clamp(Math.max(a.col, b.col), grid.length - 1);
  return grid.map((column, c) => {
    if (c < c0 || c > c1) return column;
    const r0 = clamp(Math.min(a.row, b.row), column.length - 1);
    const r1 = clamp(Math.max(a.row, b.row), column.length - 1);
    return column.map((v, r) => (r >= r0 && r <= r1 ? value : v));
  });
}

/** 드래그 시작 셀이 비어 있으면 칠하기(true), 칠해져 있으면 지우기(false) */
export function dragModeFor(grid: Grid, start: Cell): boolean {
  return !grid[start.col]?.[start.row];
}

// ---- 결과 계산 ----

/** availability[userId][date] = '0101...' */
export type AvailabilityMap = Readonly<Record<string | number, Readonly<Record<string, string>> | undefined>>;

function isAvailable(availability: AvailabilityMap, userId: number, date: string, slot: number): boolean {
  return availability[userId]?.[date]?.[slot] === '1';
}

/**
 * 결과 범위에 들어가는 멤버.
 * - 선택한 곡이 없으면 방 멤버 전원
 * - 있으면 선택한 곡 멤버들의 합집합 (방 멤버 순서 유지, 방에 없는 ID와 모르는 곡은 무시)
 */
export function scopeMembers(
  selectedSongIds: readonly number[],
  songMembers: Readonly<Record<number, readonly number[]>>,
  roomMemberIds: readonly number[],
): number[] {
  const known = selectedSongIds.filter((id) => songMembers[id] !== undefined);
  if (known.length === 0) return [...roomMemberIds];
  const union = new Set(known.flatMap((id) => songMembers[id]));
  return roomMemberIds.filter((id) => union.has(id));
}

export interface HeatCell {
  /** 가능 인원 */
  count: number;
  available: number[];
  unavailable: number[];
}

/** 한 날짜의 슬롯별 가능 인원과 명단 */
export function heatmap(
  members: readonly number[],
  availability: AvailabilityMap,
  date: string,
  slotCount: number,
): HeatCell[] {
  return Array.from({ length: slotCount }, (_, slot) => {
    const available: number[] = [];
    const unavailable: number[] = [];
    for (const id of members) (isAvailable(availability, id, date, slot) ? available : unavailable).push(id);
    return { count: available.length, available, unavailable };
  });
}

export interface SongStatus {
  songId: number;
  /** 곡 멤버 전원이 가능 (멤버가 없는 곡은 false) */
  ok: boolean;
  /** 이 슬롯에 안 되는 곡 멤버 */
  missing: number[];
}

/** 특정 슬롯에서 곡별로 합주 가능한지와 빠지는 사람 */
export function songStatusAt(
  songs: readonly { id: number; memberIds: readonly number[] }[],
  availability: AvailabilityMap,
  date: string,
  slot: number,
): SongStatus[] {
  return songs.map((s) => {
    const missing = s.memberIds.filter((id) => !isAvailable(availability, id, date, slot));
    return { songId: s.id, ok: s.memberIds.length > 0 && missing.length === 0, missing };
  });
}

export interface Block {
  date: string;
  /** 시작 슬롯 (포함) */
  startSlot: number;
  /** 끝 슬롯 (미포함) */
  endSlot: number;
}

/**
 * 범위 멤버 전원이 가능한 슬롯을 날짜별 연속 구간으로 묶는다.
 * 길이가 긴 순, 같으면 날짜·시작 시각 순. 범위가 비어 있으면 빈 목록.
 */
export function fullBlocks(
  members: readonly number[],
  availability: AvailabilityMap,
  dates: readonly string[],
  slotCount: number,
): Block[] {
  if (members.length === 0) return [];
  const blocks: Block[] = [];
  for (const date of dates) {
    let start = -1;
    for (let slot = 0; slot <= slotCount; slot++) {
      const full = slot < slotCount && members.every((id) => isAvailable(availability, id, date, slot));
      if (full && start < 0) start = slot;
      if (!full && start >= 0) {
        blocks.push({ date, startSlot: start, endSlot: slot });
        start = -1;
      }
    }
  }
  return blocks.sort(
    (a, b) =>
      b.endSlot - b.startSlot - (a.endSlot - a.startSlot) ||
      a.date.localeCompare(b.date) ||
      a.startSlot - b.startSlot,
  );
}

/** 분 → "3시간", "1시간 30분", "30분" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}시간 ${m}분`;
  return h ? `${h}시간` : `${m}분`;
}
