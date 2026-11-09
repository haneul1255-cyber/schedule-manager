import { useEffect, useState, type FormEvent } from 'react';
import { api, type RoomMember, type Song, type SongLog } from '../lib/api';

interface Props {
  roomId: string;
  songs: Song[];
  members: RoomMember[];
  isOwner: boolean;
  /** 곡이 바뀐 뒤 방 데이터를 다시 불러온다 */
  onChanged: () => Promise<void>;
}

/** 곡 추가·수정(제목·멤버)·삭제. 방 멤버 누구나 가능, 변경 기록은 방장만 열람. */
export default function SongManager({ roomId, songs, members, isOwner, onChanged }: Props) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const names = new Map(members.map((m) => [m.id, m.displayName]));

  async function remove(song: Song) {
    if (!window.confirm(`'${song.title}' 곡을 삭제할까요?`)) return;
    try {
      await api.deleteSong(song.id);
      await onChanged();
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <div>
      <div className="section-head">
        <h2 className="section-title">곡 ({songs.length})</h2>
        <div className="toolbar">
          {isOwner && (
            <button className="btn small" onClick={() => setLogsOpen((v) => !v)}>
              {logsOpen ? '변경 기록 닫기' : '변경 기록'}
            </button>
          )}
          {editing !== 'new' && (
            <button className="btn small primary" onClick={() => setEditing('new')}>
              + 곡 추가
            </button>
          )}
        </div>
      </div>

      {editing === 'new' && (
        <SongEditor
          members={members}
          submitLabel="추가"
          onCancel={() => setEditing(null)}
          onSubmit={async (title, memberIds) => {
            await api.createSong(roomId, title, memberIds);
            await onChanged();
            setEditing(null);
          }}
        />
      )}

      {songs.length === 0 && editing !== 'new' && (
        <p className="muted small">아직 곡이 없습니다. 곡을 추가하고 참여 멤버를 지정하면 곡별 합주 가능 시간을 볼 수 있어요.</p>
      )}

      <ul className="song-list">
        {songs.map((s) =>
          editing === s.id ? (
            <li key={s.id}>
              <SongEditor
                members={members}
                initial={s}
                submitLabel="저장"
                onCancel={() => setEditing(null)}
                onSubmit={async (title, memberIds) => {
                  await api.updateSong(s.id, { title, memberIds });
                  await onChanged();
                  setEditing(null);
                }}
              />
            </li>
          ) : (
            <li key={s.id} className="song-row">
              <span className="song-title">{s.title}</span>
              <span className="muted small song-members">
                {s.memberIds.length ? s.memberIds.map((id) => names.get(id) ?? '?').join(', ') : '참여 멤버 없음'}
              </span>
              <span className="song-actions">
                <button className="link-btn" onClick={() => setEditing(s.id)}>
                  수정
                </button>
                <button className="link-btn danger" onClick={() => remove(s)}>
                  삭제
                </button>
              </span>
            </li>
          ),
        )}
      </ul>

      {isOwner && logsOpen && <SongLogList roomId={roomId} />}
    </div>
  );
}

function SongEditor({
  members,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  members: RoomMember[];
  initial?: Song;
  submitLabel: string;
  onSubmit: (title: string, memberIds: number[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [selected, setSelected] = useState<Set<number>>(new Set(initial?.memberIds ?? []));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('곡 제목을 입력해 주세요.');
    setBusy(true);
    setError(null);
    try {
      // 방을 나간 멤버는 목록에 없으므로 자동으로 빠진다
      await onSubmit(title.trim(), [...selected].filter((id) => members.some((m) => m.id === id)));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="song-editor" onSubmit={submit}>
      <input
        className="text-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="곡 제목"
        maxLength={50}
        autoFocus
        aria-label="곡 제목"
      />
      <div className="member-picker" role="group" aria-label="참여 멤버">
        <span className="muted small">참여 멤버:</span>
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`chip ${selected.has(m.id) ? 'on' : ''}`}
            aria-pressed={selected.has(m.id)}
            onClick={() => toggle(m.id)}
          >
            {m.displayName}
          </button>
        ))}
        <button type="button" className="link-btn" onClick={() => setSelected(new Set(members.map((m) => m.id)))}>
          전원
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
      <div className="toolbar">
        <button type="submit" className="btn small primary" disabled={busy}>
          {busy ? '저장 중…' : submitLabel}
        </button>
        <button type="button" className="btn small" onClick={onCancel} disabled={busy}>
          취소
        </button>
      </div>
    </form>
  );
}

function describeLog(log: SongLog): string {
  const { before, after } = log.detail;
  const names = (s?: { members: { name: string }[] }) => s?.members.map((m) => m.name).join(', ') || '없음';
  switch (log.action) {
    case 'create':
      return `'${after?.title}' 추가 (멤버: ${names(after)})`;
    case 'delete':
      return `'${before?.title}' 삭제 (멤버: ${names(before)})`;
    case 'update': {
      const parts: string[] = [];
      if (before?.title !== after?.title) parts.push(`제목 '${before?.title}' → '${after?.title}'`);
      const b = new Set(before?.members.map((m) => m.id));
      const a = new Set(after?.members.map((m) => m.id));
      const added = after?.members.filter((m) => !b.has(m.id)).map((m) => m.name) ?? [];
      const removed = before?.members.filter((m) => !a.has(m.id)).map((m) => m.name) ?? [];
      if (added.length) parts.push(`멤버 추가: ${added.join(', ')}`);
      if (removed.length) parts.push(`멤버 제외: ${removed.join(', ')}`);
      return `'${after?.title}' 수정 — ${parts.join(' / ') || '변경 없음'}`;
    }
  }
}

function formatTime(sec: number): string {
  return new Date(sec * 1000).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SongLogList({ roomId }: { roomId: string }) {
  const [logs, setLogs] = useState<SongLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .songLogs(roomId)
      .then((r) => !cancelled && setLogs(r.logs))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return (
    <div className="song-logs">
      <h3 className="section-title">곡 변경 기록 (방장만 보임)</h3>
      {error && <p className="error small">{error}</p>}
      {!logs && !error && <p className="muted small">불러오는 중…</p>}
      {logs && logs.length === 0 && <p className="muted small">아직 기록이 없습니다.</p>}
      {logs && logs.length > 0 && (
        <ul>
          {logs.map((l) => (
            <li key={l.id}>
              <span className="muted">{formatTime(l.createdAt)}</span> <strong>{l.actorName}</strong>: {describeLog(l)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
