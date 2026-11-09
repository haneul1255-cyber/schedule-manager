import type { Song } from '../lib/api';
import { toggleSong } from '../lib/scope';

interface Props {
  songs: Song[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

/** [전체합주] 버튼 + 곡 토글 칩. 둘은 배타적: 곡을 고르면 전체합주 해제, 전체합주를 누르면 곡 선택 해제. */
export default function ScopeSelector({ songs, selected, onChange }: Props) {
  const all = selected.length === 0;
  return (
    <div className="scope-selector" role="group" aria-label="결과 범위">
      <button type="button" className={`chip ${all ? 'on' : ''}`} aria-pressed={all} onClick={() => onChange([])}>
        전체합주
      </button>
      {songs.map((s) => {
        const on = selected.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            className={`chip ${on ? 'on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(toggleSong(selected, s.id))}
            title={s.memberIds.length === 0 ? '참여 멤버가 지정되지 않은 곡' : undefined}
          >
            {s.title}
            <span className="chip-count">{s.memberIds.length}</span>
          </button>
        );
      })}
      {songs.length === 0 && <span className="muted small">곡을 추가하면 곡별로 결과를 볼 수 있어요.</span>}
    </div>
  );
}
