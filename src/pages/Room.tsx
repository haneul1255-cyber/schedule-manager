import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MemberList from '../components/MemberList';
import RoomSettings from '../components/RoomSettings';
import { api, ApiError, type RoomData, type RoomMember } from '../lib/api';
import { formatDateLabel } from '../lib/dates';
import { minutesToHHMM } from '../lib/slots';

export default function Room() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RoomData | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.getRoom(id));
      setLoadError(null);
    } catch (e) {
      setLoadError(e as ApiError);
    }
  }, [id]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

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
    return (
      <section className="panel">
        <h1>방을 열 수 없습니다</h1>
        <p className="error">{loadError.message}</p>
        <Link to="/">내 방 목록으로</Link>
      </section>
    );
  }
  if (!data) return <p className="muted">불러오는 중…</p>;

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
        {loadError && <p className="error small">최신 정보를 불러오지 못했습니다: {loadError.message}</p>}

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
      </section>

      {isOwner && settingsOpen && (
        <RoomSettings
          data={data}
          onClose={() => setSettingsOpen(false)}
          onSave={async (input) => {
            setData(await api.updateRoom(id, input));
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

      <section className="panel">
        <p className="muted">가능 시간 입력(4단계)과 결과 보기(5단계)가 여기에 들어갑니다.</p>
      </section>
    </div>
  );
}
