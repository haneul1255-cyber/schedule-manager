import { describe, expect, it } from 'vitest';
import {
  validateAvailability,
  validateDates,
  validateDisplayName,
  validatePassword,
  validateTimeRange,
  validateUsername,
} from './validate';

describe('validateUsername', () => {
  it('영문 소문자·숫자·밑줄 3~20자 허용', () => {
    expect(validateUsername('abc')).toBe('abc');
    expect(validateUsername('user_01')).toBe('user_01');
    expect(validateUsername('a'.repeat(20))).toBe('a'.repeat(20));
  });
  it('앞뒤 공백 제거, 대문자는 소문자로 정규화', () => {
    expect(validateUsername('  Haneul ')).toBe('haneul');
  });
  it.each(['ab', 'a'.repeat(21), 'han-eul', '하늘이', 'a b c', '', null, 123])('거부: %s', (v) => {
    expect(() => validateUsername(v)).toThrow();
  });
});

describe('validatePassword', () => {
  it('8자 이상 허용', () => {
    expect(validatePassword('12345678')).toBe('12345678');
  });
  it('7자 이하, 문자열 아님, 너무 긴 값 거부', () => {
    expect(() => validatePassword('1234567')).toThrow();
    expect(() => validatePassword(undefined)).toThrow();
    expect(() => validatePassword('x'.repeat(201))).toThrow();
  });
});

describe('validateDisplayName', () => {
  it('1~20자, 앞뒤 공백 제거', () => {
    expect(validateDisplayName(' 하늘 ')).toBe('하늘');
    expect(validateDisplayName('가'.repeat(20))).toBe('가'.repeat(20));
  });
  it('빈 값이나 21자 이상 거부', () => {
    expect(() => validateDisplayName('   ')).toThrow();
    expect(() => validateDisplayName('가'.repeat(21))).toThrow();
  });
});

describe('validateDates', () => {
  it('중복 제거 + 정렬', () => {
    expect(validateDates(['2026-11-15', '2026-11-14', '2026-11-15'])).toEqual(['2026-11-14', '2026-11-15']);
  });
  it('잘못된 날짜·빈 목록·32개 이상 거부', () => {
    expect(() => validateDates(['2026-02-30'])).toThrow();
    expect(() => validateDates([])).toThrow();
    expect(() => validateDates('2026-11-14')).toThrow();
    const many = Array.from({ length: 32 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`).slice(0, 31);
    expect(validateDates(many)).toHaveLength(31);
    expect(() => validateDates([...many, '2027-01-01'])).toThrow();
  });
});

describe('validateTimeRange', () => {
  it('30분 단위, 시작 < 끝', () => {
    expect(validateTimeRange(600, 1440)).toEqual({ dayStart: 600, dayEnd: 1440 });
    expect(() => validateTimeRange(615, 1440)).toThrow();
    expect(() => validateTimeRange(600, 600)).toThrow();
    expect(() => validateTimeRange(700, 600)).toThrow();
    expect(() => validateTimeRange(-30, 600)).toThrow();
    expect(() => validateTimeRange(600, 1470)).toThrow();
    expect(() => validateTimeRange('600', 900)).toThrow();
  });
});

describe('validateAvailability', () => {
  const dates = ['2026-11-14', '2026-11-15'];
  it('정상 입력', () => {
    expect(validateAvailability({ '2026-11-14': '0110' }, dates, 4)).toEqual([['2026-11-14', '0110']]);
  });
  it('방에 없는 날짜 거부', () => {
    expect(() => validateAvailability({ '2026-11-16': '0110' }, dates, 4)).toThrow(/방에 없는 날짜/);
  });
  it('길이가 다르거나 0/1 이외 문자가 있으면 거부', () => {
    expect(() => validateAvailability({ '2026-11-14': '011' }, dates, 4)).toThrow();
    expect(() => validateAvailability({ '2026-11-14': '01102' }, dates, 4)).toThrow();
    expect(() => validateAvailability({ '2026-11-14': '01a0' }, dates, 4)).toThrow();
    expect(() => validateAvailability({ '2026-11-14': 110 }, dates, 4)).toThrow();
  });
  it('빈 본문 거부', () => {
    expect(() => validateAvailability({}, dates, 4)).toThrow();
  });
});
