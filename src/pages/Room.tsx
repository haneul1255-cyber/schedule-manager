import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AvailabilityGrid from '../components/AvailabilityGrid';
import MemberList from '../components/MemberList';
import ResultPanel from '../components/ResultPanel';
import RoomSettings from '../components/RoomSettings';
import ScopeSelector from '../components/ScopeSelector';
import SongManager from '../components/SongManager';
import { api, ApiError, type RoomData, type RoomMember } from '../lib/api';
import { formatDateLabel } from '../lib/dates';
import { formatSongsParam, parseSongsParam } from '../lib/scope';
import {
  gridFromAvailability,
  gridToAvailability,
  minutesToHHMM,
  scopeMembers,
  slotCount,
  type AvailabilityMap,
  type Grid,
} from '../lib/slots';
import { useAvailabilitySaver, type SaveStatus } from '../lib/useAvailabilitySaver';

const POLL_MS = 30_000;

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: '',
  pending: '변경됨…',
  saving: '저장 중…',
  saved: '저장됨 ✓',
  error: '저장 실패',
};

/** 내 그리드가 현재 방 설정(날짜 수·슬롯 수)과 모양이 맞는지 */
function gridMatches(grid: Grid | null, data: RoomData): boolean {
  const n = slotCount(data.room.dayStart, data.room.dayEnd, data.room.slotMinutes);
  return !!grid && grid.length === data.dates.length && grid.every((col) => col.length === n);
}

function timeOfDay(d: Date): string {
  return d.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Room() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RoomData | null>(null);
  const [myGrid, setMyGrid] = useState<Grid | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const saver = useAvailabilitySaver(id);
  const { hasUnsaved, discard, lastLocalAt } = saver; // 모두 참조가 고정된 값
  const myGridRef = useRef<Grid | null>(null);
  myGridRef.current = myGrid;

  /** 서버에서 받은 방 데이터를 반영. 내 그리드는 로컬 변경이 없을 때만 서버 값으로 맞춘다. */
  const applyData = useCallback(
    (next: RoomData, fetchStartedAt: number) => {
      setData(next);
      const shapeOk = gridMatches(myGridRef.current, next);
      const localNewer = hasUnsaved() || fetchStartedAt < lastLocalAt.current;
      if (!shapeOk || !localNewer) {
        if (!shapeOk) discard(); // 방 설정이 바뀌어 기존 모양으로는 저장할 수 없다
        const n = slotCount(next.room.dayStart, next.room.dayEnd, next.room.slotMinutes);
        setMyGrid(gridFromAvailability(next.dates, next.availability[next.me.id], n));
      }
    },
    [hasUnsaved, discard, lastLocalAt],
  );

  const load = useCallback(async () => {
    const startedAt = Date.now();
    setLoading(true);
    try {
      applyData(await api.getRoom(id), startedAt);
      setLoadError(null);
      setLastLoadedAt(new Date());
    } catch (e) {
      const err = e as ApiError;
      // 내보내졌거나 방이 삭제된 경우: 남아 있는 화면을 지우고 안내
      if (err.status === 403) {
        discard();
        setData(null);
        setMyGrid(null);
      }
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [id, applyData, discard]);

  // 첫 로드 + 30초 폴링 (탭이 보이지 않을 때는 쉬고, 다시 보이면 즉시 갱신)
  useEffect(() => {
    setData(null);
    setMyGrid(null);
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  /** 결과 계산용 availability: 서버 데이터에 아직 저장 전일 수 있는 내 로컬 입력을 덮어쓴 것 */
  const availability = useMemo<AvailabilityMap>(() => {
    if (!data || !myGrid || !gridMatches(myGrid, data)) return data?.availability ?? {};
    return { ...data.availability, [data.me.id]: gridToAvailability(data.dates, myGrid) };
  }, [data, myGrid]);

  // 결과 범위: 선택한 곡은 URL 쿼리(?songs=3,5)에 둔다 → 링크를 공유하면 같은 화면
  const [searchParams, setSearchParams] = useSearchParams();
  const songsParam = searchParams.get('songs');
  const selectedSongIds = useMemo(() => {
    const ids = parseSongsParam(songsParam);
    return data ? ids.filter((id) => data.songs.some((s) => s.id === id)) : ids;
  }, [songsParam, data]);
  const setSelectedSongIds = useCallback(
    (ids: number[]) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (ids.length) next.set('songs', formatSongsParam(ids));
          else next.delete('songs');
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );
  // 삭제된 곡 등 없는 ID가 URL에 남아 있으면 정리
  useEffect(() => {
    if (data && songsParam !== null && formatSongsParam(selectedSongIds) !== songsParam) {
      setSelectedSongIds(selectedSongIds);
    }
  }, [data, songsParam, selectedSongIds, setSelectedSongIds]);

  const memberIds = useMemo(() => data?.members.map((m) => m.id) ?? [], [data]);
  const scope = useMemo(() => {
    const songMembers = Object.fromEntries((data?.songs ?? []).map((s) => [s.id, s.memberIds]));
    return scopeMembers(selectedSongIds, songMembers, memberIds);
  }, [selectedSongIds, data, memberIds]);

  /** 확인 → API 호출 → 다시 불러오기. 실패하면 알림. */
  async function act(confirmMsg: string | null, fn: () => Promise<unknown>, after?: () => void) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await fn();
      if (after) after();
      else await load();
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  if (loadError && !data) {
    const forbidden = loadError.status === 403;
    return (
      <section className="panel">
        <h1>{forbidden ? '방에 접근할 수 없습니다' : '방을 불러오지 못했습니다'}</h1>
        <p className="error">{loadError.message}</p>
        {forbidden && (
          <p className="muted small">방이 삭제되었거나 방에서 내보내졌을 수 있습니다. 초대 링크로 다시 참가할 수 있어요.</p>
        )}
        <div className="toolbar" style={{ marginTop: 12 }}>
          {!forbidden && (
            <button className="btn" onClick={() => void load()}>
              다시 시도
            </button>
          )}
          <Link to="/" className="btn">
            내 방 목록으로
          </Link>
        </div>
      </section>
    );
  }
  if (!data || !myGrid) return <p className="muted">불러오는 중…</p>;

  const isOwner = data.me.role === 'owner';
  const inviteUrl = `${window.location.origin}/join/${data.room.inviteCode}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice('초대 링크를 복사했습니다.');
    } catch {
      window.prompt('아래 링크를 복사하세요.', inviteUrl);
    }
    setTimeout(() => setNotice(null), 2500);
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h1>{data.room.name}</h1>
            <p className="muted small">
              {data.dates.length}일 ({data.dates.map(formatDateLabel).join(', ')}) ·{' '}
              {minutesToHHMM(data.room.dayStart)}–{minutesToHHMM(data.room.dayEnd)}
            </p>
          </div>
          <div className="toolbar">
            <button className="btn" onClick={copyInvite}>
              🔗 초대 링크 복사
            </button>
            {isOwner ? (
              <button className="btn" onClick={() => setSettingsOpen((v) => !v)}>
                ⚙ 방 설정
              </button>
            ) : (
              <button
                className="btn"
                onClick={() =>
                  act('방을 나가면 내 가능 시간과 곡 참여 정보가 삭제됩니다. 나갈까요?', () => api.leaveRoom(id), () =>
                    navigate('/'),
                  )
                }
              >
                방 나가기
              </button>
            )}
          </div>
        </div>
        {notice && <p className="notice">{notice}</p>}

        <h2 className="section-title">멤버 ({data.members.length}명)</h2>
        <MemberList
          members={data.members}
          meId={data.me.id}
          isOwner={isOwner}
          onTransfer={(m: RoomMember) =>
            act(`${m.displayName}님에게 방장을 넘길까요? 넘긴 뒤에는 방 설정을 바꿀 수 없습니다.`, () =>
              api.transferOwner(id, m.id),
            ).then(() => setSettingsOpen(false))
          }
          onKick={(m: RoomMember) =>
            act(
              `${m.displayName}님을 내보낼까요? 이 멤버의 가능 시간과 곡 참여 정보가 삭제됩니다.\n` +
                '다시 들어오지 못하게 하려면 방 설정에서 초대 링크를 재발급하세요.',
              () => api.kickMember(id, m.id),
            )
          }
        />

        <SongManager roomId={id} songs={data.songs} members={data.members} isOwner={isOwner} onChanged={load} />
      </section>

      {isOwner && settingsOpen && (
        <RoomSettings
          data={data}
          onClose={() => setSettingsOpen(false)}
          onSave={async (input) => {
            const startedAt = Date.now();
            applyData(await api.updateRoom(id, input), startedAt);
            setSettingsOpen(false);
          }}
          onRegenerateInvite={() =>
            act('초대 링크를 재발급할까요? 기존 링크는 더 이상 쓸 수 없습니다.', () => api.regenerateInvite(id))
          }
          onDelete={() =>
            act(`"${data.room.name}" 방을 삭제할까요? 되돌릴 수 없습니다.`, () => api.deleteRoom(id), () =>
              navigate('/'),
            )
          }
        />
      )}

      <div className="sync-bar">
        <span className="muted small">
          {lastLoadedAt && `마지막 갱신 ${timeOfDay(lastLoadedAt)} · 30초마다 자동 갱신`}
        </span>
        {loadError && <span className="error small">갱신 실패: {loadError.message}</span>}
        <button className="btn small" onClick={() => void load()} disabled={loading}>
          {loading ? '불러오는 중…' : '↻ 새로고침'}
        </button>
      </div>

      <div className="room-columns">
        <section className="panel">
          <div className="panel-head compact">
            <h2>내 가능 시간</h2>
            <span className={`save-status ${saver.status}`} aria-live="polite">
              {SAVE_LABEL[saver.status]}
              {saver.status === 'error' && (
                <>
                  {saver.error && <span className="small"> ({saver.error})</span>}{' '}
                  <button className="link-btn" onClick={() => void saver.retry()}>
                    다시 시도
                  </button>
                </>
              )}
            </span>
          </div>
          <p className="muted small hint-line">
            가능한 시간을 드래그해서 칠하세요. 칠해진 칸에서 시작하면 지워집니다.
            <span className="touch-only"> 화면을 스크롤하려면 왼쪽 시간 영역이나 그리드 바깥을 밀어 주세요.</span>
          </p>
          <AvailabilityGrid
            dates={data.dates}
            dayStart={data.room.dayStart}
            slotMinutes={data.room.slotMinutes}
            value={myGrid}
            onCommit={(next) => {
              setMyGrid(next);
              saver.schedule(data.dates, next);
            }}
          />
        </section>

        <ResultPanel
          data={data}
          availability={availability}
          slotCount={slotCount(data.room.dayStart, data.room.dayEnd, data.room.slotMinutes)}
          scope={scope}
          selectedSongs={data.songs.filter((s) => selectedSongIds.includes(s.id))}
          scopeSelector={
            <ScopeSelector songs={data.songs} selected={selectedSongIds} onChange={setSelectedSongIds} />
          }
        />
      </div>
    </div>
  );
}
