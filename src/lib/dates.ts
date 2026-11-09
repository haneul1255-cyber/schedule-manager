// 날짜 유틸. 날짜는 모두 'YYYY-MM-DD' 문자열이며 Asia/Seoul 기준이다.
// 요일 계산 등은 UTC로 해서 브라우저의 로컬 시간대 영향을 받지 않게 한다.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function toDateString(y: number, monthIndex: number, d: number): string {
  const dt = new Date(Date.UTC(y, monthIndex, d));
  return dt.toISOString().slice(0, 10);
}

export function todayInSeoul(now: Date = new Date()): string {
  // en-CA 로캘은 YYYY-MM-DD 형식
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** '2026-11-14' → '11/14(토)' */
export function formatDateLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}(${WEEKDAYS[weekdayOf(date)]})`;
}

export function weekdayName(date: string): string {
  return WEEKDAYS[weekdayOf(date)];
}

/**
 * 달력 한 달치 칸. 일요일 시작, 앞뒤 빈칸은 null.
 * monthIndex는 0~11.
 */
export function monthGrid(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toDateString(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
