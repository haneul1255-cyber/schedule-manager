import { useState, type FormEvent } from 'react';
import type { RoomInput } from '../lib/api';
import { formatDateLabel } from '../lib/dates';
import { minutesToHHMM, SLOT_MINUTES } from '../lib/slots';
import DateCalendar from './DateCalendar';
import styles from './CreateRoomForm.module.css';

interface Props {
  initial?: RoomInput;
  submitLabel: string;
  onSubmit: (input: RoomInput) => Promise<void>;
  onCancel?: () => void;
}

const TIMES = Array.from({ length: 1440 / SLOT_MINUTES + 1 }, (_, i) => i * SLOT_MINUTES);

/** 방 만들기 / 방 설정 수정에 같이 쓰는 폼 */
export default function CreateRoomForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dates, setDates] = useState<string[]>(initial?.dates ?? []);
  const [dayStart, setDayStart] = useState(initial?.dayStart ?? 600);
  const [dayEnd, setDayEnd] = useState(initial?.dayEnd ?? 1320);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isEdit = !!initial;
  const removedDates = isEdit ? initial.dates.filter((d) => !dates.includes(d)) : [];
  const narrowed = isEdit && (dayStart > initial.dayStart || dayEnd < initial.dayEnd);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('방 이름을 입력해 주세요.');
    if (dates.length === 0) return setError('날짜를 하나 이상 선택해 주세요.');
    if (dates.length > 31) return setError('날짜는 31개까지 선택할 수 있습니다.');
    if (dayStart >= dayEnd) return setError('시작 시간은 끝 시간보다 앞이어야 합니다.');
    if (
      (removedDates.length > 0 || narrowed) &&
      !window.confirm('빠진 날짜와 범위 밖 시간에 입력된 가능 시간은 모든 멤버에게서 삭제됩니다. 계속할까요?')
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), dates, dayStart, dayEnd });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        방 이름
        <input
          className={styles.nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="예: 11월 정기공연 합주"
          required
        />
      </label>
      <div className={styles.field}>
        날짜 <span className={styles.summary}>달력에서 여러 날짜를 눌러 선택</span>
        <DateCalendar selected={dates} onChange={setDates} />
        <span className={styles.summary}>
          {dates.length === 0
            ? '선택한 날짜 없음'
            : `${dates.length}일 선택: ${dates.map(formatDateLabel).join(', ')}`}
        </span>
      </div>
      <div className={styles.row}>
        <label className={styles.field}>
          하루 시작
          <select value={dayStart} onChange={(e) => setDayStart(Number(e.target.value))}>
            {TIMES.slice(0, -1).map((t) => (
              <option key={t} value={t}>
                {minutesToHHMM(t)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          하루 끝
          <select value={dayEnd} onChange={(e) => setDayEnd(Number(e.target.value))}>
            {TIMES.slice(1).map((t) => (
              <option key={t} value={t}>
                {minutesToHHMM(t)}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.summary}>30분 단위</span>
      </div>
      {(removedDates.length > 0 || narrowed) && (
        <p className={styles.warning}>
          ⚠ 빠진 날짜{removedDates.length > 0 && `(${removedDates.map(formatDateLabel).join(', ')})`}나 범위 밖
          시간에 입력된 가능 시간은 삭제됩니다.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? '저장 중…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            취소
          </button>
        )}
      </div>
    </form>
  );
}
