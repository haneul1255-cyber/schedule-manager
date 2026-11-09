import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext', () => {
  it('같은 사이트 경로는 그대로', () => {
    expect(safeNext('/join/abc')).toBe('/join/abc');
    expect(safeNext('/rooms/x?songs=1,2')).toBe('/rooms/x?songs=1,2');
  });
  it.each([null, undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)'])(
    '외부·이상한 값은 기본값: %s',
    (v) => {
      expect(safeNext(v)).toBe('/');
    },
  );
});
