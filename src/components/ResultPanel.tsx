import { useMemo, useState } from 'react';
import type { RoomData, Song } from '../lib/api';
import { formatDateLabel } from '../lib/dates';
import { formatDuration, fullBlocks, minutesToHHMM, type AvailabilityMap } from '../lib/slots';
import HeatmapGrid from './HeatmapGrid';

interface Props {
  data: RoomData;
  /** 내 로컬 입력이 반영된 availability */
  availability: AvailabilityMap;
  slotCount: number;
  scope: number[];
  selectedSongs: Song[];
  /** 범위 선택 UI (6단계: 전체합주/곡 칩) */
  scopeSelector?: React.ReactNode;
}

const BLOCKS_PREVIEW = 8;

export default function ResultPanel({ data, availability, slotCount, scope, selectedSongs, scopeSelector }: Props) {
  const [onlyFull, setOnlyFull] = useState(false);
  const [showAllBlocks, setShowAllBlocks] = useState(false);
  const { dates, room } = data;

  const names = useMemo(() => new Map(data.members.map((m) => [m.id, m.displayName])), [data.members]);
  const blocks = useMemo(
    () => fullBlocks(scope, availability, dates, slotCount),
    [scope, availability, dates, slotCount],
  );
  /** 범위 안에서 아직 한 칸도 입력하지 않은 사람 */
  const notEntered = useMemo(
    () => scope.filter((id) => !Object.values(availability[id] ?? {}).some((s) => s.includes('1'))),
    [scope, availability],
  );

  const time = (slot: number) => minutesToHHMM(room.dayStart + slot * room.slotMinutes);
  const shownBlocks = showAllBlocks ? blocks : blocks.slice(0, BLOCKS_PREVIEW);

  return (
    <section className="panel">
      <h2>결과 보기</h2>
      {scopeSelector}
      <p className="scope-line">
        <span className="muted">범위:</span>{' '}
        {scope.length > 0 ? (
          <>
            {scope.map((id) => names.get(id)).join(', ')} <strong>({scope.length}명)</strong>
          </>
        ) : (
          <span className="error">선택한 곡에 참여 멤버가 없습니다.</span>
        )}
      </p>
      {notEntered.length > 0 && scope.length > 0 && (
        <p className="muted small">아직 입력 안 함: {notEntered.map((id) => names.get(id)).join(', ')}</p>
      )}

      <div className="result-controls">
        <label className="toggle">
          <input type="checkbox" checked={onlyFull} onChange={(e) => setOnlyFull(e.target.checked)} />
          전원 가능한 시간만 보기
        </label>
        {scope.length > 0 && <Legend total={scope.length} />}
      </div>

      <HeatmapGrid
        dates={dates}
        dayStart={room.dayStart}
        slotMinutes={room.slotMinutes}
        slotCount={slotCount}
        scope={scope}
        availability={availability}
        names={names}
        selectedSongs={selectedSongs}
        onlyFull={onlyFull}
      />
      <p className="muted small hint-line-top">칸에 마우스를 올리거나(모바일은 탭) 가능한 사람을 확인하세요.</p>

      <h3 className="section-title">전원 가능 구간</h3>
      {scope.length === 0 ? (
        <p className="muted small">범위에 멤버가 없습니다.</p>
      ) : blocks.length === 0 ? (
        <p className="muted small">
          {notEntered.length === scope.length
            ? '아직 아무도 시간을 입력하지 않았습니다.'
            : '전원이 가능한 시간이 아직 없습니다.'}
        </p>
      ) : (
        <>
          <ol className="block-list">
            {shownBlocks.map((b) => (
              <li key={`${b.date}-${b.startSlot}`}>
                <span>
                  {formatDateLabel(b.date)} {time(b.startSlot)}–{time(b.endSlot)}
                </span>
                <span className="muted"> · {formatDuration((b.endSlot - b.startSlot) * room.slotMinutes)}</span>
              </li>
            ))}
          </ol>
          {blocks.length > BLOCKS_PREVIEW && (
            <button className="link-btn" onClick={() => setShowAllBlocks((v) => !v)}>
              {showAllBlocks ? '접기' : `${blocks.length - BLOCKS_PREVIEW}개 더 보기`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** 0명 … 전원 색 범례 (전원은 별도 색) */
function Legend({ total }: { total: number }) {
  const steps = total <= 6 ? Array.from({ length: total + 1 }, (_, i) => i) : [0, Math.round(total / 2), total - 1, total];
  return (
    <span className="legend" aria-hidden>
      {steps.map((n) => (
        <span key={n} className="legend-item">
          <span
            className="legend-swatch"
            style={{
              background:
                n === 0
                  ? 'var(--cell-off)'
                  : n === total
                    ? 'var(--heat-full)'
                    : `rgba(var(--heat-rgb), ${(0.1 + (n / total) * 0.5).toFixed(3)})`,
            }}
          />
          {n === total ? `${n}명(전원)` : `${n}`}
        </span>
      ))}
    </span>
  );
}
