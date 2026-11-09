import { describe, expect, it } from 'vitest';
import { validateDisplayName, validatePassword, validateUsername } from './validate';

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
