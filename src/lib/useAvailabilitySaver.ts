import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { gridToAvailability, type Grid } from './slots';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 500;

/**
 * 내 가능 시간 자동 저장. 변경 후 0.5초 동안 추가 변경이 없으면 저장한다.
 * 저장 중에 또 바뀌면, 끝난 뒤 최신 값으로 한 번 더 저장한다.
 */
export function useAvailabilitySaver(roomId: string) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ dates: string[]; grid: Grid } | null>(null);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** 마지막으로 로컬에서 바꾸거나 저장을 마친 시각. 그 전에 시작된 폴링 결과로 내 입력을 덮지 않기 위해 사용. */
  const lastLocalAt = useRef(0);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current || !pending.current) return;
    const job = pending.current;
    pending.current = null;
    saving.current = true;
    setStatus('saving');
    let ok = false;
    try {
      await api.saveAvailability(roomId, gridToAvailability(job.dates, job.grid));
      ok = true;
      setError(null);
      setStatus(pending.current ? 'pending' : 'saved');
    } catch (e) {
      pending.current ??= job; // 재시도할 수 있게 되돌려 둔다
      setError((e as Error).message);
      setStatus('error');
    } finally {
      saving.current = false;
      lastLocalAt.current = Date.now();
    }
    // 저장 중에 들어온 변경이 있고 디바운스 타이머가 이미 끝났다면 바로 이어서 저장.
    // 실패한 경우에는 자동 재시도하지 않는다 (무한 재시도 방지) — 다시 시도 버튼이나 다음 변경 때 저장.
    if (ok && pending.current && !timer.current) void flush();
  }, [roomId]);

  const schedule = useCallback(
    (dates: string[], grid: Grid) => {
      pending.current = { dates, grid };
      lastLocalAt.current = Date.now();
      setStatus('pending');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        void flush();
      }, DEBOUNCE_MS);
    },
    [flush],
  );

  /** 서버 값으로 초기화할 때 (방 설정 변경 등) 저장 대기 중인 변경을 버린다. */
  const discard = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    pending.current = null;
    setStatus('idle');
    setError(null);
  }, []);

  const hasUnsaved = useCallback(() => saving.current || pending.current !== null, []);

  // 저장 안 된 변경이 있으면 페이지를 떠날 때 경고
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved()) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearTimeout(timer.current);
    };
  }, [hasUnsaved]);

  return { status, error, schedule, retry: flush, discard, hasUnsaved, lastLocalAt };
}
