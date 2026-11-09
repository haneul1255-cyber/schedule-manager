import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

/** 초대 링크. 로그인은 RequireAuth가 처리하고, 로그인되면 바로 참가 후 방으로 이동한다. */
export default function Join() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode 이중 실행 방지
    started.current = true;
    api
      .joinRoom(code)
      .then((r) => navigate(`/rooms/${r.roomId}`, { replace: true }))
      .catch((e: Error) => setError(e.message));
  }, [code, navigate]);

  if (error) {
    return (
      <section className="panel">
        <h1>참가할 수 없습니다</h1>
        <p className="error">{error}</p>
        <p className="muted">링크가 바뀌었을 수 있습니다. 방장에게 새 초대 링크를 받아 주세요.</p>
        <Link to="/">내 방 목록으로</Link>
      </section>
    );
  }
  return <p className="muted">방에 참가하는 중…</p>;
}
