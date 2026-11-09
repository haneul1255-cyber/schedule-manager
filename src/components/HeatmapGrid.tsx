import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Song } from '../lib/api';
import { formatDateLabel } from '../lib/dates';
import { heatmap, minutesToHHMM, songStatusAt, type AvailabilityMap, type HeatCell } from '../lib/slots';
import GridHeader, { gridColumns } from './GridHeader';
import styles from './TimeGrid.module.css';

interface Props {
  dates: string[];
  dayStart: number;
  slotMinutes: number;
  slotCount: number;
  /** 결과 범위 멤버 ID */
  scope: number[];
  availability: AvailabilityMap;
  names: ReadonlyMap<number, string>;
  /** 선택한 곡 (툴팁에 곡별 가능 여부 표시) */
  selectedSongs: Song[];
  onlyFull: boolean;
}

interface Tip {
  col: number;
  row: number;
  rect: DOMRect;
  /** 탭/클릭으로 고정된 툴팁 */
  pinned: boolean;
}

/** 셀 색: 농도 = 가능 인원 / 범위 인원. 전원 가능은 별도의 진한 색. */
function cellColor(cell: HeatCell, total: number, onlyFull: boolean): string {
  if (total === 0 || cell.count === 0) return 'var(--cell-off)';
  if (cell.count === total) return 'var(--heat-full)';
  if (onlyFull) return 'var(--cell-off)';
  const ratio = cell.count / total;
  return `rgba(var(--heat-rgb), ${(0.1 + ratio * 0.5).toFixed(3)})`;
}

export default function HeatmapGrid(props: Props) {
  const { dates, dayStart, slotMinutes, slotCount, scope, availability, names, selectedSongs, onlyFull } = props;
  const gridRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(null);

  const heat = useMemo(
    () => dates.map((d) => heatmap(scope, availability, d, slotCount)),
    [dates, scope, availability, slotCount],
  );
  const total = scope.length;

  function cellFrom(target: EventTarget | null): { col: number; row: number; el: HTMLElement } | null {
    const el = (target as HTMLElement | null)?.closest?.<HTMLElement>('[data-cell]');
    if (!el || !gridRef.current?.contains(el)) return null;
    return { col: Number(el.dataset.col), row: Number(el.dataset.row), el };
  }

  // 마우스: 호버로 표시
  function onPointerMove(e: ReactPointerEvent) {
    if (e.pointerType !== 'mouse' || tip?.pinned) return;
    const c = cellFrom(e.target);
    if (!c) return;
    if (!tip || tip.col !== c.col || tip.row !== c.row) {
      setTip({ col: c.col, row: c.row, rect: c.el.getBoundingClientRect(), pinned: false });
    }
  }
  function onPointerLeave(e: ReactPointerEvent) {
    if (e.pointerType === 'mouse' && !tip?.pinned) setTip(null);
  }
  // 탭(모바일)·클릭: 고정/해제
  function onClick(e: React.MouseEvent) {
    const c = cellFrom(e.target);
    if (!c) return;
    if (tip?.pinned && tip.col === c.col && tip.row === c.row) setTip(null);
    else setTip({ col: c.col, row: c.row, rect: c.el.getBoundingClientRect(), pinned: true });
  }

  // 고정된 툴팁: 바깥을 누르거나 스크롤하면 닫기
  useEffect(() => {
    if (!tip) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (e.type === 'pointerdown' && (gridRef.current?.contains(t) || tipRef.current?.contains(t))) return;
      setTip(null);
    };
    document.addEventListener('pointerdown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [tip]);

  // 툴팁 위치: 셀 오른쪽 → 왼쪽 → (좁은 화면) 셀 아래·위. 셀을 가리지 않고 화면 밖으로 나가지 않게.
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return setTipPos(null);
    const { width, height } = tipRef.current.getBoundingClientRect();
    const { rect } = tip;
    const m = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
    if (rect.right + m + width <= vw - m) {
      setTipPos({ left: rect.right + m, top: clamp(rect.top, m, vh - height - m) });
    } else if (rect.left - m - width >= m) {
      setTipPos({ left: rect.left - m - width, top: clamp(rect.top, m, vh - height - m) });
    } else {
      const left = clamp(rect.left + rect.width / 2 - width / 2, m, vw - width - m);
      const below = rect.bottom + m;
      setTipPos({ left, top: below + height <= vh - m ? below : Math.max(m, rect.top - m - height) });
    }
  }, [tip, scope, selectedSongs]);

  const nameList = (ids: number[]) => ids.map((id) => names.get(id) ?? '?').join(', ');

  let tipContent = null;
  if (tip) {
    const date = dates[tip.col];
    const cell = heat[tip.col]?.[tip.row];
    if (cell) {
      const statuses = songStatusAt(selectedSongs, availability, date, tip.row);
      tipContent = (
        <>
          <div className="tip-title">
            {formatDateLabel(date)} {minutesToHHMM(dayStart + tip.row * slotMinutes)} ·{' '}
            <strong>
              {cell.count}/{total}명 가능
            </strong>
          </div>
          {cell.available.length > 0 && <div className="tip-ok">가능: {nameList(cell.available)}</div>}
          {cell.unavailable.length > 0 && <div className="tip-no">불가: {nameList(cell.unavailable)}</div>}
          {statuses.length > 0 && (
            <div className="tip-songs">
              {statuses.map((s, i) => (
                <span key={s.songId} className={s.ok ? 'tip-ok' : 'tip-no'}>
                  {s.ok ? '✓' : '✗'} {selectedSongs[i].title}
                  {!s.ok && s.missing.length > 0 && ` (${nameList(s.missing)} 불가)`}
                  {!s.ok && selectedSongs[i].memberIds.length === 0 && ' (참여 멤버 없음)'}
                </span>
              ))}
            </div>
          )}
        </>
      );
    }
  }

  return (
    <div className={styles.scroll}>
      <div
        ref={gridRef}
        className={styles.grid}
        style={{ gridTemplateColumns: gridColumns(dates.length) }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
        aria-label="결과 히트맵"
      >
        <GridHeader dates={dates} />
        {Array.from({ length: slotCount }, (_, r) => {
          const minutes = dayStart + r * slotMinutes;
          const onHour = minutes % 60 === 0;
          return (
            <div key={r} className={styles.cells}>
              <div className={styles.time}>{onHour || r === 0 ? minutesToHHMM(minutes) : ''}</div>
              {dates.map((d, c) => {
                const cell = heat[c][r];
                const full = total > 0 && cell.count === total;
                const active = tip?.col === c && tip?.row === r;
                return (
                  <div
                    key={d}
                    data-cell=""
                    data-col={c}
                    data-row={r}
                    aria-label={`${formatDateLabel(d)} ${minutesToHHMM(minutes)} ${cell.count}/${total}명 가능`}
                    className={[
                      styles.cell,
                      styles.heat,
                      onHour ? styles.hour : styles.half,
                      c === dates.length - 1 ? styles.last : '',
                      r === slotCount - 1 ? styles.bottom : '',
                      full ? styles.full : '',
                      active ? styles.active : '',
                    ].join(' ')}
                    style={{ background: cellColor(cell, total, onlyFull) }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      {tip && tipContent && (
        <div
          ref={tipRef}
          className="tooltip"
          role="tooltip"
          onClick={() => setTip(null)}
          style={tipPos ? { left: tipPos.left, top: tipPos.top } : { left: -9999, top: 0 }}
        >
          {tipContent}
        </div>
      )}
    </div>
  );
}
