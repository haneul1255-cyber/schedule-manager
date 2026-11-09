// 결과 범위 선택(전체합주 / 곡 다중 선택)과 URL 쿼리(?songs=3,5) 처리

/** '3,5' → [3, 5]. 잘못된 값은 무시하고 중복 제거, 오름차순. */
export function parseSongsParam(value: string | null): number[] {
  if (!value) return [];
  const ids = value
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isSafeInteger(n) && n > 0);
  return [...new Set(ids)].sort((a, b) => a - b);
}

export function formatSongsParam(ids: readonly number[]): string {
  return [...new Set(ids)].sort((a, b) => a - b).join(',');
}

/** 곡 칩 토글. 곡을 고르면 전체합주는 자동으로 해제된다 (빈 선택 = 전체합주). */
export function toggleSong(selected: readonly number[], songId: number): number[] {
  return selected.includes(songId)
    ? selected.filter((id) => id !== songId)
    : [...selected, songId].sort((a, b) => a - b);
}
