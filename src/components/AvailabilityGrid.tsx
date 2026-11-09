import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { formatDateLabel } from '../lib/dates';
import { applyRect, dragModeFor, minutesToHHMM, type Cell, type Grid } from '../lib/slots';
import GridHeader, { gridColumns } from './GridHeader';
import styles from './TimeGrid.module.css';

interface Props {
  dates: string[];
  dayStart: number;
  slotMinutes: number;
  /** 확정된 내 가능 시간 grid[dateIndex][slotIndex] */
  value: Grid;
  /** 드래그를 마쳐 확정됐을 때 호출 */
  onCommit: (next: Grid) => void;
  disabled?: boolean;
}

interface DragState {
  start: Cell;
  current: Cell;
  /** true = 칠하기, false = 지우기 */
  paint: boolean;
}

/**
 * when2meet식 드래그 입력 그리드 (세로: 시간, 가로: 날짜).
 * 누른 셀이 비어 있으면 칠하기, 칠해져 있으면 지우기. 시작 셀과 현재 셀을 꼭짓점으로 하는
 * 직사각형에 적용하며, 드래그 중에는 미리보기만 보여주고 손을 떼면 확정한다.
 */
export default function AvailabilityGrid({ dates, dayStart, slotMinutes, value, onCommit, disabled }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const valueRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  valueRef.current = value;
  onCommitRef.current = onCommit;

  const updateDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  /** 화면 좌표의 셀. 터치는 포인터가 시작 요소에 잡혀 있으므로 target 대신 elementFromPoint를 쓴다. */
  function cellAt(x: number, y: number): Cell | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
    if (!el || !gridRef.current?.contains(el)) return null;
    return { col: Number(el.dataset.col), row: Number(el.dataset.row) };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || dragRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();
    updateDrag({ start: cell, current: cell, paint: dragModeFor(valueRef.current, cell) });
  }

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      // 그리드 밖으로 나가면 마지막 셀을 유지
      const cell = cellAt(e.clientX, e.clientY);
      if (cell && (cell.col !== d.current.col || cell.row !== d.current.row)) {
        updateDrag({ ...d, current: cell });
      }
    }
    function onUp() {
      const d = dragRef.current;
      if (!d) return;
      updateDrag(null);
      onCommitRef.current(applyRect(valueRef.current, d.start, d.current, d.paint));
    }
    function onCancel() {
      updateDrag(null); // 시스템이 제스처를 가로챈 경우: 확정하지 않고 취소
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [dragging]);

  const shown = drag ? applyRect(value, drag.start, drag.current, drag.paint) : value;
  const rows = value[0]?.length ?? 0;

  return (
    <div className={styles.scroll}>
      <div
        ref={gridRef}
        className={`${styles.grid} ${drag ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
        style={{ gridTemplateColumns: gridColumns(dates.length) }}
        onPointerDown={onPointerDown}
        role="grid"
        aria-label="내 가능 시간 입력"
      >
        <GridHeader dates={dates} />
        {Array.from({ length: rows }, (_, r) => {
          const minutes = dayStart + r * slotMinutes;
          const onHour = minutes % 60 === 0;
          return (
            <div key={r} className={styles.cells} role="row">
              <div className={styles.time}>{onHour || r === 0 ? minutesToHHMM(minutes) : ''}</div>
              {dates.map((d, c) => (
                <div
                  key={d}
                  data-cell=""
                  data-col={c}
                  data-row={r}
                  role="gridcell"
                  aria-selected={shown[c][r]}
                  aria-label={`${formatDateLabel(d)} ${minutesToHHMM(minutes)}`}
                  className={[
                    styles.cell,
                    onHour ? styles.hour : styles.half,
                    c === dates.length - 1 ? styles.last : '',
                    r === rows - 1 ? styles.bottom : '',
                    shown[c][r] ? styles.on : '',
                  ].join(' ')}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
