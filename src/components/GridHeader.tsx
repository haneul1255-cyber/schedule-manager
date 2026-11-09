import { formatDateLabel, weekdayOf } from '../lib/dates';
import styles from './TimeGrid.module.css';

/** 두 그리드가 같이 쓰는 날짜 헤더 줄 (왼쪽 위 빈칸 포함) */
export default function GridHeader({ dates }: { dates: string[] }) {
  return (
    <>
      <div className={styles.corner} />
      {dates.map((d) => {
        const wd = weekdayOf(d);
        const [md, w] = formatDateLabel(d).split('(');
        return (
          <div key={d} className={`${styles.dateHead} ${wd === 0 ? styles.sun : wd === 6 ? styles.sat : ''}`}>
            {md}
            <small>({w}</small>
          </div>
        );
      })}
    </>
  );
}

export function gridColumns(dateCount: number): string {
  return `44px repeat(${dateCount}, minmax(44px, 1fr))`;
}
