import { describe, expect, it } from 'vitest';
import { formatSongsParam, parseSongsParam, toggleSong } from './scope';

describe('parseSongsParam / formatSongsParam', () => {
  it('파싱: 정렬·중복 제거·잘못된 값 무시', () => {
    expect(parseSongsParam('5,3,5')).toEqual([3, 5]);
    expect(parseSongsParam(' 3 , x, -1, 0, 2.5, 7')).toEqual([3, 7]);
    expect(parseSongsParam('')).toEqual([]);
    expect(parseSongsParam(null)).toEqual([]);
  });
  it('왕복', () => {
    expect(formatSongsParam([5, 3])).toBe('3,5');
    expect(parseSongsParam(formatSongsParam([9, 2, 4]))).toEqual([2, 4, 9]);
  });
});

describe('toggleSong', () => {
  it('없으면 추가(정렬), 있으면 제거', () => {
    expect(toggleSong([], 5)).toEqual([5]);
    expect(toggleSong([5], 3)).toEqual([3, 5]);
    expect(toggleSong([3, 5], 3)).toEqual([5]);
    expect(toggleSong([5], 5)).toEqual([]); // 마지막 곡을 끄면 전체합주로
  });
});
