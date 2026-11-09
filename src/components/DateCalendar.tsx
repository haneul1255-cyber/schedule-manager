import { useState } from 'react';
import { monthGrid, todayInSeoul, weekdayOf } from '../lib/dates';
import styles from './DateCalendar.module.css';

interface Props {
  selected: string[];
  onChange: (dates: string[]) => void;
  /** 오늘 이전 날짜는 새로 고를 수 없다 (이미 선택된 날짜는 해제 가능) */
  disablePast?: boolean;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 여러 날짜를 클릭으로 선택/해제하는 달력 (Asia/Seoul 기준) */
export default function DateCalendar({ selected, onChange, disablePast = true }: Props) {
  const today = todayInSeoul();
  const initial = selected.length ? selected.slice().sort()[0] : today;
  const [year, setYear] = useState(Number(initial.slice(0, 4)));
  const [month, setMonth] = useState(Number(initial.slice(5, 7)) - 1);
  const set = new Set(selected);

  function move(delta: number) {
    const m = month + delta;
    setYear(year + Math.floor(m / 12));
    setMonth(((m % 12) + 12) % 12);
  }

  function toggle(date: string) {
    const next = new Set(set);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    onChange([...next].sort());
  }

  const cells = monthGrid(year, month);
  const thisMonth = today.slice(0, 7);
  const viewMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  return (
    <div className={styles.calendar}>
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => move(-1)}
          disabled={disablePast && viewMonth <= thisMonth && !selected.some((d) => d < `${viewMonth}-01`)}
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className={styles.title}>
          {year}년 {month + 1}월
        </span>
        <button type="button" className={styles.navBtn} onClick={() => move(1)} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`${styles.weekday} ${i === 0 ? styles.sun : i === 6 ? styles.sat : ''}`}>
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const isSel = set.has(date);
          const disabled = disablePast && date < today && !isSel;
          const wd = weekdayOf(date);
          const cls = [
            styles.day,
            isSel ? styles.selected : wd === 0 ? styles.sun : wd === 6 ? styles.sat : '',
            date === today ? styles.today : '',
          ].join(' ');
          return (
            <button
              key={date}
              type="button"
              className={cls}
              disabled={disabled}
              aria-pressed={isSel}
              aria-label={date}
              onClick={() => toggle(date)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
