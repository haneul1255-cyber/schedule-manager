import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CreateRoomForm from '../components/CreateRoomForm';
import { api, type RoomSummary } from '../lib/api';
import { formatDateLabel } from '../lib/dates';
import { minutesToHHMM } from '../lib/slots';

export default function Rooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setError(null);
    api
      .listRooms()
      .then((r) => setRooms(r.rooms))
      .catch((e: Error) => setError(e.message));
  };
  useEffect(load, []);

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h1>내 방</h1>
          {!creating && (
            <button className="btn primary" onClick={() => setCreating(true)}>
              + 방 만들기
            </button>
          )}
        </div>
        {error && (
          <div className="error-box">
            <p className="error">{error}</p>
            <button className="btn small" onClick={load}>
              다시 시도
            </button>
          </div>
        )}
        {!rooms && !error && <p className="muted">불러오는 중…</p>}
        {rooms && rooms.length === 0 && (
          <p className="muted">아직 참여한 방이 없습니다. 방을 만들거나 초대 링크로 참가해 보세요.</p>
        )}
        {rooms && rooms.length > 0 && (
          <ul className="room-list">
            {rooms.map((r) => (
              <li key={r.id}>
                <Link to={`/rooms/${r.id}`} className="room-item">
                  <span className="room-name">
                    {r.name} {r.role === 'owner' && <span className="badge">방장</span>}
                  </span>
                  <span className="muted small">
                    {r.firstDate &&
                      (r.firstDate === r.lastDate
                        ? formatDateLabel(r.firstDate)
                        : `${formatDateLabel(r.firstDate)} ~ ${formatDateLabel(r.lastDate!)}`)}{' '}
                    ({r.dateCount}일) · {minutesToHHMM(r.dayStart)}–{minutesToHHMM(r.dayEnd)} · {r.memberCount}명
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creating && (
        <section className="panel">
          <h2>방 만들기</h2>
          <CreateRoomForm
            submitLabel="만들기"
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              const r = await api.createRoom(input);
              navigate(`/rooms/${r.room.id}`);
            }}
          />
        </section>
      )}
    </div>
  );
}
