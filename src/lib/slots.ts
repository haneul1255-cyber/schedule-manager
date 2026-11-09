// 슬롯 관련 순수 함수. 서버(functions)와 클라이언트가 함께 사용한다.

export const SLOT_MINUTES = 30;

/** 하루 시작~끝(분) 사이의 슬롯 개수 */
export function slotCount(dayStart: number, dayEnd: number, slotMinutes = SLOT_MINUTES): number {
  return Math.floor((dayEnd - dayStart) / slotMinutes);
}

/** 자정부터의 분 → "HH:MM" (1440 → "24:00") */
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

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
    const offset = newStart + i * slotMinutes - oldStart;
    const j = offset / slotMinutes;
    out += Number.isInteger(j) && j >= 0 && j < slots.length ? slots[j] : '0';
  }
  return out;
}
