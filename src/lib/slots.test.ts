import { describe, expect, it } from 'vitest';
import {
  applyRect,
  boolsToSlots,
  dragModeFor,
  formatDuration,
  fullBlocks,
  heatmap,
  gridFromAvailability,
  gridToAvailability,
  hhmmToMinutes,
  hhmmToSlotIndex,
  isValidSlots,
  minutesToHHMM,
  remapSlots,
  scopeMembers,
  slotCount,
  slotIndexToHHMM,
  slotsToBools,
  songStatusAt,
  type Grid,
} from './slots';

describe('slotCount', () => {
  it('30분 단위 슬롯 수', () => {
    expect(slotCount(600, 1440)).toBe(28);
    expect(slotCount(0, 30)).toBe(1);
  });
});

describe('슬롯 문자열 ↔ boolean 배열', () => {
  it('왕복 변환', () => {
    expect(slotsToBools('0110')).toEqual([false, true, true, false]);
    expect(boolsToSlots([false, true, true, false])).toBe('0110');
    expect(boolsToSlots(slotsToBools('101100111'))).toBe('101100111');
  });
  it('길이 지정 시 부족하면 false로 채우고 넘치면 자른다', () => {
    expect(slotsToBools('1', 3)).toEqual([true, false, false]);
    expect(slotsToBools('', 2)).toEqual([false, false]);
    expect(slotsToBools('1111', 2)).toEqual([true, true]);
  });
  it('빈 배열 ↔ 빈 문자열', () => {
    expect(boolsToSlots([])).toBe('');
    expect(slotsToBools('')).toEqual([]);
  });
  it('isValidSlots', () => {
    expect(isValidSlots('0101', 4)).toBe(true);
    expect(isValidSlots('010', 4)).toBe(false);
    expect(isValidSlots('0102', 4)).toBe(false);
    expect(isValidSlots('01 1', 4)).toBe(false);
    expect(isValidSlots(1010, 4)).toBe(false);
    expect(isValidSlots(null, 0)).toBe(false);
  });
});

describe('시간 변환', () => {
  it.each([
    [0, '00:00'],
    [570, '09:30'],
    [600, '10:00'],
    [1440, '24:00'],
  ])('minutesToHHMM %i ↔ %s', (m, s) => {
    expect(minutesToHHMM(m)).toBe(s);
    expect(hhmmToMinutes(s)).toBe(m);
  });
  it('hhmmToMinutes: 잘못된 형식은 NaN', () => {
    expect(hhmmToMinutes('9:30')).toBeNaN();
    expect(hhmmToMinutes('10:60')).toBeNaN();
    expect(hhmmToMinutes('24:30')).toBeNaN();
  });
  it('slotIndexToHHMM: 10:00 시작', () => {
    expect(slotIndexToHHMM(0, 600)).toBe('10:00');
    expect(slotIndexToHHMM(1, 600)).toBe('10:30');
    expect(slotIndexToHHMM(7, 600)).toBe('13:30');
    expect(slotIndexToHHMM(28, 600)).toBe('24:00');
  });
  it('hhmmToSlotIndex: 왕복, 경계가 아니거나 시작 전이면 -1', () => {
    for (let i = 0; i < 28; i++) expect(hhmmToSlotIndex(slotIndexToHHMM(i, 600), 600)).toBe(i);
    expect(hhmmToSlotIndex('10:15', 600)).toBe(-1);
    expect(hhmmToSlotIndex('09:30', 600)).toBe(-1);
    expect(hhmmToSlotIndex('abc', 600)).toBe(-1);
  });
});

describe('remapSlots', () => {
  // 10:00~12:00 (4슬롯): 10:00, 10:30, 11:00, 11:30
  const old = '1011';
  it('범위가 같으면 그대로', () => expect(remapSlots(old, 600, 600, 720)).toBe(old));
  it('뒤로 늘리면 새 슬롯은 0', () => expect(remapSlots(old, 600, 600, 780)).toBe('101100'));
  it('앞으로 늘리면 앞에 0', () => expect(remapSlots(old, 600, 540, 720)).toBe('001011'));
  it('줄이면 범위 밖 입력만 버린다', () => expect(remapSlots(old, 600, 630, 690)).toBe('01'));
  it('겹치지 않으면 전부 0', () => expect(remapSlots(old, 600, 900, 960)).toBe('00'));
  it('이동: 10~12시 → 11~13시', () => expect(remapSlots(old, 600, 660, 780)).toBe('1100'));
});

describe('gridFromAvailability / gridToAvailability', () => {
  const dates = ['2026-11-14', '2026-11-15'];
  it('입력 없는 날짜는 전부 false', () => {
    const g = gridFromAvailability(dates, { '2026-11-14': '101' }, 3);
    expect(g).toEqual([
      [true, false, true],
      [false, false, false],
    ]);
  });
  it('availability가 없어도 동작', () => {
    expect(gridFromAvailability(dates, undefined, 2)).toEqual([
      [false, false],
      [false, false],
    ]);
  });
  it('왕복', () => {
    const av = { '2026-11-14': '1010', '2026-11-15': '0111' };
    expect(gridToAvailability(dates, gridFromAvailability(dates, av, 4))).toEqual(av);
  });
});

describe('applyRect (직사각형 드래그)', () => {
  const empty = (cols: number, rows: number): Grid =>
    Array.from({ length: cols }, () => Array(rows).fill(false));
  const show = (g: Grid) => g.map(boolsToSlots);

  it('한 칸', () => {
    expect(show(applyRect(empty(2, 3), { col: 1, row: 1 }, { col: 1, row: 1 }, true))).toEqual(['000', '010']);
  });
  it('여러 날짜에 걸친 직사각형', () => {
    const g = applyRect(empty(3, 4), { col: 0, row: 1 }, { col: 1, row: 2 }, true);
    expect(show(g)).toEqual(['0110', '0110', '0000']);
  });
  it('꼭짓점 순서와 무관 (위로·왼쪽으로 드래그)', () => {
    const a = applyRect(empty(3, 4), { col: 2, row: 3 }, { col: 1, row: 0 }, true);
    const b = applyRect(empty(3, 4), { col: 1, row: 0 }, { col: 2, row: 3 }, true);
    expect(show(a)).toEqual(['0000', '1111', '1111']);
    expect(a).toEqual(b);
  });
  it('지우기 모드는 영역만 false로, 나머지는 유지', () => {
    const full: Grid = [
      [true, true, true],
      [true, true, true],
    ];
    expect(show(applyRect(full, { col: 0, row: 1 }, { col: 1, row: 1 }, false))).toEqual(['101', '101']);
  });
  it('원본 그리드를 변경하지 않는다', () => {
    const g = empty(2, 2);
    applyRect(g, { col: 0, row: 0 }, { col: 1, row: 1 }, true);
    expect(show(g)).toEqual(['00', '00']);
  });
  it('범위 밖 좌표는 경계로 잘린다', () => {
    expect(show(applyRect(empty(2, 2), { col: -5, row: -1 }, { col: 9, row: 0 }, true))).toEqual(['10', '10']);
  });
  it('dragModeFor: 빈 칸에서 시작하면 칠하기, 칠한 칸이면 지우기', () => {
    const g: Grid = [[true, false]];
    expect(dragModeFor(g, { col: 0, row: 0 })).toBe(false);
    expect(dragModeFor(g, { col: 0, row: 1 })).toBe(true);
  });
});

// ---- 결과 계산 ----

describe('scopeMembers', () => {
  const room = [1, 2, 3, 4, 5];
  const songs = { 10: [1, 2], 11: [2, 3], 12: [5], 13: [] as number[] };
  it('선택한 곡이 없으면 전원', () => {
    expect(scopeMembers([], songs, room)).toEqual(room);
  });
  it('곡 하나', () => {
    expect(scopeMembers([10], songs, room)).toEqual([1, 2]);
  });
  it('여러 곡은 합집합 (중복 없이, 방 멤버 순서)', () => {
    expect(scopeMembers([12, 11, 10], songs, room)).toEqual([1, 2, 3, 5]);
  });
  it('모르는 곡 ID는 무시, 전부 모르는 곡이면 전원', () => {
    expect(scopeMembers([10, 999], songs, room)).toEqual([1, 2]);
    expect(scopeMembers([999], songs, room)).toEqual(room);
  });
  it('방에 없는 멤버는 제외', () => {
    expect(scopeMembers([10], { 10: [1, 99] }, room)).toEqual([1]);
  });
  it('멤버가 없는 곡만 고르면 범위가 비어 있다', () => {
    expect(scopeMembers([13], songs, room)).toEqual([]);
  });
});

describe('heatmap', () => {
  const av = {
    1: { d: '110' },
    2: { d: '011' },
    3: {}, // 이 날짜 입력 없음
  };
  it('슬롯별 가능 인원과 명단', () => {
    expect(heatmap([1, 2, 3], av, 'd', 3)).toEqual([
      { count: 1, available: [1], unavailable: [2, 3] },
      { count: 2, available: [1, 2], unavailable: [3] },
      { count: 1, available: [2], unavailable: [1, 3] },
    ]);
  });
  it('입력이 전혀 없는 사용자도 불가로 센다', () => {
    expect(heatmap([4], av, 'd', 2)).toEqual([
      { count: 0, available: [], unavailable: [4] },
      { count: 0, available: [], unavailable: [4] },
    ]);
  });
  it('범위 밖 멤버는 세지 않는다', () => {
    expect(heatmap([2], av, 'd', 3).map((c) => c.count)).toEqual([0, 1, 1]);
  });
});

describe('songStatusAt', () => {
  const av = { 1: { d: '11' }, 2: { d: '10' }, 3: { d: '01' } };
  const songs = [
    { id: 10, memberIds: [1, 2] },
    { id: 11, memberIds: [1, 3] },
    { id: 12, memberIds: [] },
  ];
  it('곡별 가능 여부와 빠지는 사람', () => {
    expect(songStatusAt(songs, av, 'd', 0)).toEqual([
      { songId: 10, ok: true, missing: [] },
      { songId: 11, ok: false, missing: [3] },
      { songId: 12, ok: false, missing: [] },
    ]);
    expect(songStatusAt(songs, av, 'd', 1)).toEqual([
      { songId: 10, ok: false, missing: [2] },
      { songId: 11, ok: true, missing: [] },
      { songId: 12, ok: false, missing: [] },
    ]);
  });
});

describe('fullBlocks', () => {
  const dates = ['2026-11-14', '2026-11-15'];
  const av = {
    1: { '2026-11-14': '11110111', '2026-11-15': '00111111' },
    2: { '2026-11-14': '01110110', '2026-11-15': '00011100' },
  };
  it('전원 가능 슬롯을 연속 구간으로 묶어 길이순 정렬', () => {
    expect(fullBlocks([1, 2], av, dates, 8)).toEqual([
      { date: '2026-11-14', startSlot: 1, endSlot: 4 },
      { date: '2026-11-15', startSlot: 3, endSlot: 6 },
      { date: '2026-11-14', startSlot: 5, endSlot: 7 },
    ]);
  });
  it('하루 끝까지 이어지는 구간도 닫힌다', () => {
    expect(fullBlocks([1], av, ['2026-11-15'], 8)).toEqual([{ date: '2026-11-15', startSlot: 2, endSlot: 8 }]);
  });
  it('전원 가능한 시간이 없거나 범위가 비면 빈 목록', () => {
    expect(fullBlocks([1, 2], { 1: {}, 2: {} }, dates, 8)).toEqual([]);
    expect(fullBlocks([], av, dates, 8)).toEqual([]);
  });
});

describe('formatDuration', () => {
  it.each([
    [30, '30분'],
    [60, '1시간'],
    [90, '1시간 30분'],
    [180, '3시간'],
  ])('%i분 → %s', (m, s) => expect(formatDuration(m)).toBe(s));
});
