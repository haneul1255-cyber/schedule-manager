import { describe, expect, it } from 'vitest';
import { formatDateLabel, isValidDate, monthGrid, todayInSeoul } from './dates';

describe('dates', () => {
  it('isValidDate', () => {
    expect(isValidDate('2026-11-14')).toBe(true);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-1-01')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
  it('formatDateLabel', () => {
    expect(formatDateLabel('2026-11-14')).toBe('11/14(토)');
    expect(formatDateLabel('2026-11-09')).toBe('11/9(월)');
  });
  it('todayInSeoul은 서울 기준 날짜 (UTC 15시 이후는 다음 날)', () => {
    expect(todayInSeoul(new Date('2026-11-09T14:59:00Z'))).toBe('2026-11-09');
    expect(todayInSeoul(new Date('2026-11-09T15:00:00Z'))).toBe('2026-11-10');
  });
  it('monthGrid: 2026년 11월은 일요일 시작, 30일', () => {
    const g = monthGrid(2026, 10);
    expect(g[0]).toBe('2026-11-01');
    expect(g.filter(Boolean)).toHaveLength(30);
    expect(g.length % 7).toBe(0);
  });
});
