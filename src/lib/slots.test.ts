import { describe, expect, it } from 'vitest';
import { minutesToHHMM, remapSlots, slotCount } from './slots';

describe('slotCount', () => {
  it('30분 단위 슬롯 수', () => {
    expect(slotCount(600, 1440)).toBe(28);
    expect(slotCount(0, 30)).toBe(1);
  });
});

describe('minutesToHHMM', () => {
  it.each([
    [0, '00:00'],
    [570, '09:30'],
    [600, '10:00'],
    [1440, '24:00'],
  ])('%i → %s', (m, s) => expect(minutesToHHMM(m)).toBe(s));
});

describe('remapSlots', () => {
  // 10:00~12:00 (4슬롯): 10:00, 10:30, 11:00, 11:30
  const old = '1011';
  it('범위가 같으면 그대로', () => {
    expect(remapSlots(old, 600, 600, 720)).toBe(old);
  });
  it('뒤로 늘리면 새 슬롯은 0', () => {
    expect(remapSlots(old, 600, 600, 780)).toBe('101100');
  });
  it('앞으로 늘리면 앞에 0', () => {
    expect(remapSlots(old, 600, 540, 720)).toBe('001011');
  });
  it('줄이면 범위 밖 입력만 버린다', () => {
    expect(remapSlots(old, 600, 630, 690)).toBe('01');
  });
  it('겹치지 않으면 전부 0', () => {
    expect(remapSlots(old, 600, 900, 960)).toBe('00');
  });
  it('이동: 10~12시 → 11~13시', () => {
    expect(remapSlots(old, 600, 660, 780)).toBe('1100');
  });
});
